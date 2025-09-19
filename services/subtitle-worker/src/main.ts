import 'reflect-metadata';

import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type {
  IMessageConsumer,
  IMessagePublisher,
} from '@monorepo/message-queue';

// Core monorepo imports, following the thumbnail-worker pattern
import { DI_TOKENS } from '@monorepo/core';
import { MessageQueueChannels } from '@monorepo/message-queue';
import { logger } from '@subtitle-worker/config/logger';

// Local subtitle-worker imports
import { GenerateSubtitleUseCase } from './application/generate-subtitle.usecase';
import config from './config';
import { setupDI } from './config/di.config';

// This assumes that the DI setup will be augmented to provide these shared services,
// similar to how other workers in the monorepo are configured.
setupDI();

const sourceLanguage = 'en';
const targetLanguages = ['hi', 'pa'];

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
  logger.info('Starting Subtitle Worker...');

  await dbConnection.connect(config.MONGO_URL).catch((error) => {
    logger.fatal('Failed to connect to MongoDB', { error });
    process.exit(1);
  });
  logger.info('Successfully connected to MongoDB');

  await messageConsumer.connect(config.RABBITMQ_URL).catch((error) => {
    logger.fatal('Failed to connect to RabbitMQ', { error });
    process.exit(1);
  });
  logger.info('Successfully connected to RabbitMQ');

  await messageConsumer.consume('subtitle_tasks', async (content, msg) => {
    if (!msg) {
      logger.warn('Received null message');
      return;
    }

    if (!content || !content.jobId || !content.taskId || !content.sourceUrl) {
      logger.warn('Received invalid message format. Discarding.', {
        content,
      });
      messageConsumer.ack(msg); // Acknowledge and discard
      return;
    }

    const { jobId, taskId, payload } = content;
    logger.info(`Received job ${jobId} with task ${taskId}`, {
      jobId,
      taskId,
    });

    try {
      const generateSubtitle = container.resolve(GenerateSubtitleUseCase);

      const output = await generateSubtitle.execute({
        jobId,
        taskId,
        payload: {
          outputDir: '/tmp/output',
          sourceFileUrl: content.sourceUrl,
          sourceLanguage: content.payload?.sourceLanguage ?? sourceLanguage,
          targetLanguages: content.payload?.targetLanguages ?? targetLanguages,
        },
      });

      await messagePublisher.publish('task_completed', {
        jobId,
        taskId,
        taskType: 'subtitle',
        output,
      });

      messageConsumer.ack(msg);
      logger.info(`Successfully processed and acknowledged job ${jobId}`, {
        jobId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        `Error processing job ${jobId}. Message will be rejected.`,
        error,
      );

      await messagePublisher.publish('task_failed', {
        jobId,
        taskId,
      });

      // Reject the message without requeueing if processing fails.
      messageConsumer.nack(msg, false);
    }
  });

  logger.info(
    `Waiting for messages in queue: ${MessageQueueChannels.subtitle}`,
  );

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    await messageConsumer.close();
    await dbConnection.close();
    logger.info('Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.fatal('Subtitle worker failed to start', { error });
  process.exit(1);
});
