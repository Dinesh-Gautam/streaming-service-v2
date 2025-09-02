import 'reflect-metadata';

import { container } from 'tsyringe';

import { WinstonLogger } from '@monorepo/logger';
import { GenerateThumbnailUseCase } from '@thumbnail-worker/application/use-cases/generate-thumbnail.usecase';
import { config } from '@thumbnail-worker/infrastructure/config';
import { logger } from '@thumbnail-worker/infrastructure/logger';
import { FfmpegProcessor } from '@thumbnail-worker/infrastructure/media/FfmpegProcessor';
import { RabbitMQAdapter } from '@thumbnail-worker/infrastructure/messaging/RabbitMQAdapter';
import { MongoJobRepository } from '@thumbnail-worker/infrastructure/persistence/MongoJobRepository';

// Register dependencies
container.register('MessageQueue', { useClass: RabbitMQAdapter });
container.register('JobRepository', { useClass: MongoJobRepository });
container.register('MediaProcessor', { useClass: FfmpegProcessor });
container.register('Logger', { useClass: WinstonLogger });

async function main() {
  const jobRepository = container.resolve(MongoJobRepository);
  const messageQueue = container.resolve(RabbitMQAdapter);

  await jobRepository.connect(config.MONGO_URL, config.MONGO_DB_NAME);
  await messageQueue.connect(config.RABBITMQ_URL);

  const generateThumbnailUseCase = container.resolve(GenerateThumbnailUseCase);

  messageQueue.consume(config.THUMBNAIL_QUEUE, async (message) => {
    if (message && message.jobId) {
      try {
        await generateThumbnailUseCase.execute(message.jobId);
      } catch (error) {
        logger.error(`Failed to process job ${message.jobId}`, { error });
      }
    }
  });

  const shutdown = async () => {
    await messageQueue.close();
    await jobRepository.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.fatal('Thumbnail worker failed to start', { error });
  process.exit(1);
});
