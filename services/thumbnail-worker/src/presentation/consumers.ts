import 'reflect-metadata';

import { container } from 'tsyringe';

import { MongoDbConnection } from '@monorepo/database';
import { WinstonLogger } from '@monorepo/logger';
import { RabbitMQAdapter } from '@monorepo/message-queue';
import { GenerateThumbnailUseCase } from '@thumbnail-worker/application/use-cases/generate-thumbnail.usecase';
import { config } from '@thumbnail-worker/infrastructure/config';
import { logger } from '@thumbnail-worker/infrastructure/logger';
import { FfmpegProcessor } from '@thumbnail-worker/infrastructure/media/FfmpegProcessor';
import { MongoJobRepository } from '@thumbnail-worker/infrastructure/persistence/MongoJobRepository';

// Register dependencies
container.registerSingleton(MongoDbConnection);
container.register('MessageConsumer', { useClass: RabbitMQAdapter });
container.register('JobRepository', { useClass: MongoJobRepository });
container.register('MediaProcessor', { useClass: FfmpegProcessor });
container.register('Logger', { useClass: WinstonLogger });

async function main() {
  const dbConnection = container.resolve(MongoDbConnection);
  await dbConnection.connect(config.MONGO_URL);

  const messageConsumer = container.resolve<RabbitMQAdapter>('MessageConsumer');
  await messageConsumer.connect(config.RABBITMQ_URL);

  const generateThumbnailUseCase = container.resolve(GenerateThumbnailUseCase);

  messageConsumer.consume(config.THUMBNAIL_QUEUE, async (msg) => {
    if (msg) {
      const message = JSON.parse(msg.content.toString());
      if (message && message.jobId && message.taskId && message.sourceUrl) {
        try {
          await generateThumbnailUseCase.execute({
            jobId: message.jobId,
            taskId: message.taskId,
            sourceUrl: message.sourceUrl,
          });
          messageConsumer.getChannel().ack(msg);
        } catch (error) {
          logger.error(
            `Failed to process message for job ${message.jobId}, task ${message.taskId}`,
            { error },
          );
          // Requeue the message for a retry, or send to a dead-letter queue
          messageConsumer.getChannel().nack(msg, false, false);
        }
      } else {
        logger.warn('Received invalid message:', { message });
        messageConsumer.getChannel().ack(msg); // Acknowledge and discard invalid messages
      }
    }
  });

  const shutdown = async () => {
    await messageConsumer.close();
    await dbConnection.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.fatal('Thumbnail worker failed to start', { error });
  process.exit(1);
});
