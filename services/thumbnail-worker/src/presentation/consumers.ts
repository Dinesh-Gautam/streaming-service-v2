import 'reflect-metadata';

import { container } from 'tsyringe';

import { WinstonLogger } from '@monorepo/logger';
import { GenerateThumbnailUseCase } from '@thumbnail-worker/application/use-cases/generate-thumbnail.usecase';
import { FfmpegProcessor } from '@thumbnail-worker/infrastructure/media/FfmpegProcessor';
import { RabbitMQAdapter } from '@thumbnail-worker/infrastructure/messaging/RabbitMQAdapter';
import { MongoJobRepository } from '@thumbnail-worker/infrastructure/persistence/MongoJobRepository';

// Register dependencies
container.register('JobRepository', { useClass: MongoJobRepository });
container.register('MediaProcessor', { useClass: FfmpegProcessor });
container.register('Logger', { useClass: WinstonLogger });

async function main() {
  const rabbitMQAdapter = new RabbitMQAdapter();
  await rabbitMQAdapter.connect();

  const generateThumbnailUseCase = container.resolve(GenerateThumbnailUseCase);

  rabbitMQAdapter.consume('thumbnail-jobs', async (message) => {
    if (message && message.id) {
      await generateThumbnailUseCase.execute(message.id);
    }
  });
}

main().catch((error) => {
  const logger = container.resolve(WinstonLogger);
  logger.fatal('Thumbnail worker failed to start', { error });
  process.exit(1);
});
