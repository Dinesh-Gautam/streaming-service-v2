import 'reflect-metadata';

import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type { IMessageConsumer } from '@monorepo/message-queue';

import { DI_TOKENS } from '@monorepo/core';
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

const generateThumbnailUseCase = container.resolve(GenerateThumbnailUseCase);

async function main() {
  await dbConnection.connect(config.MONGO_URL);
  await messageConsumer.connect(config.RABBITMQ_URL);

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
          messageConsumer.ack(msg);
        } catch (error) {
          logger.error(
            `Failed to process message for job ${message.jobId}, task ${message.taskId}`,
            { error },
          );
          // Requeue the message for a retry, or send to a dead-letter queue
          messageConsumer.nack(msg, false);
        }
      } else {
        logger.warn('Received invalid message:', { message });
        messageConsumer.ack(msg); // Acknowledge and discard invalid messages
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
  logger.fatal('Thumbnail worker failed to start', error);
  process.exit(1);
});
