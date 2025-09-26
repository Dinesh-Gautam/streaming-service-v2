import 'reflect-metadata';

import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type {
  IMessageConsumer,
  IMessagePublisher,
} from '@monorepo/message-queue';

import { DI_TOKENS } from '@monorepo/core';
import { config } from '@transcoding-worker/config';
import { setupDI } from '@transcoding-worker/config/di.config';
import { logger } from '@transcoding-worker/config/logger';

import { TranscodingUseCase } from './use-cases/transcoding.usecase';

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

  messageConsumer.consume<'transcode_tasks'>(
    'transcode_tasks',
    async (content, msg) => {
      if (!msg) {
        logger.warn('Received null message');
        return;
      }

      console.log(content);

      if (!content || !content.jobId || !content.taskId || !content.sourceUrl) {
        logger.warn('Received invalid message:');
        messageConsumer.ack(msg); // Acknowledge and discard invalid messages

        return;
      }

      try {
        const transcodingUseCase = container.resolve(TranscodingUseCase);

        logger.debug('message', content);

        const result = await transcodingUseCase.execute({
          jobId: content.jobId,
          taskId: content.taskId,
          sourceUrl: content.sourceUrl,
          dubbedAudioPaths: content.payload?.dubbedAudioPaths,
        });

        await messagePublisher.publish('task_completed', {
          jobId: content.jobId,
          taskId: content.taskId,
          output: result.output,
          taskType: 'transcode',
        });

        messageConsumer.ack(msg);
      } catch (error) {
        await messagePublisher.publish('task_failed', {
          jobId: content.jobId,
          taskId: content.taskId,
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
  logger.fatal('Transcoding worker failed to start', error);
  process.exit(1);
});
