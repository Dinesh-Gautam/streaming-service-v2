import 'reflect-metadata';

import { container } from 'tsyringe';

import type { WorkerMessages } from '@monorepo/core';
import type { IDatabaseConnection } from '@monorepo/database';
import type {
  IMessageConsumer,
  IMessagePublisher,
} from '@monorepo/message-queue';

import { DI_TOKENS, MessageQueueChannels } from '@monorepo/core';
import { config } from '@thumbnail-worker/config';
import { setupDI } from '@thumbnail-worker/config/di.config';
import { logger } from '@thumbnail-worker/config/logger';
import { GenerateThumbnailUseCase } from '@thumbnail-worker/use-cases/generate-thumbnail.usecase';

setupDI();

const dbConnection = container.resolve<IDatabaseConnection>(
  DI_TOKENS.DatabaseConnection,
);
const messageConsumer = container.resolve<IMessageConsumer>(
  DI_TOKENS.MessageConsumer,
);
const messagePublisher = container.resolve<IMessagePublisher>(
  DI_TOKENS.MessagePublisher,
);

async function main() {
  await dbConnection.connect(config.MONGO_URL).catch((error) => {
    logger.fatal('Failed to connect to MongoDB', error);
    process.exit(1);
  });
  await messageConsumer.connect(config.RABBITMQ_URL).catch((error) => {
    logger.fatal('Failed to connect to RabbitMQ', error);
    process.exit(1);
  });

  messageConsumer.consume(
    MessageQueueChannels['thumbnail-worker'],
    async (msg) => {
      if (!msg) {
        logger.warn('Received null message');
        return;
      }

      const message: WorkerMessages['thumbnail-worker'] = JSON.parse(
        msg.content.toString(),
      );

      console.log(message);

      if (!message || !message.jobId || !message.taskId || !message.sourceUrl) {
        logger.warn('Received invalid message:');
        messageConsumer.ack(msg); // Acknowledge and discard invalid messages

        return;
      }

      try {
        const generateThumbnailUseCase = container.resolve(
          GenerateThumbnailUseCase,
        );

        logger.debug('message', message);

        const result = await generateThumbnailUseCase.execute({
          jobId: message.jobId,
          taskId: message.taskId,
          sourceUrl: message.sourceUrl,
        });

        await messagePublisher.publish(MessageQueueChannels.TaskCompleted, {
          jobId: message.jobId,
          taskId: message.taskId,
          output: result.output,
        });
        messageConsumer.ack(msg);
      } catch (error) {
        await messagePublisher.publish(MessageQueueChannels.TaskFailed, {
          jobId: message.jobId,
          taskId: message.taskId,
        });
        logger.error('Error processing message', error);
        // Requeue the message for a retry, or send to a dead-letter queue
        messageConsumer.nack(msg, false);
      }
    },
  );

  const shutdown = async () => {
    await messageConsumer.close();
    await dbConnection.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.fatal('Thumbnail worker failed to start', error);
  process.exit(1);
});
