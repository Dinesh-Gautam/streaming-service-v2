import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type {
  IMessageConsumer,
  IMessagePublisher,
} from '@monorepo/message-queue';

import config from '@ai-worker/config';
import { setupDI } from '@ai-worker/config/di.config';
import { logger } from '@ai-worker/config/logger';
import { AIProcessingUseCase } from '@ai-worker/use-cases/ai-processing.usecase';
import { DI_TOKENS } from '@monorepo/core';
import { MessageQueueChannels } from '@monorepo/message-queue';

import { aiRouter } from './routes/ai.routes';

setupDI();

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  }),
);

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
  logger.info('Starting AI Worker...');

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

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  app.use('/api', aiRouter);

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.message, err);
    return res.status(500).json({ error: 'Internal Server Error' });
  });

  await messageConsumer.consume(
    MessageQueueChannels.ai,
    async (content, msg) => {
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

      const { jobId, taskId, sourceUrl } = content;
      logger.info(`Received job ${jobId} with task ${taskId}`, {
        jobId,
        taskId,
      });

      try {
        const aiProcessingUseCase = container.resolve(AIProcessingUseCase);

        const result = await aiProcessingUseCase.execute({
          jobId,
          taskId,
          sourceUrl,
        });

        await messagePublisher.publish(MessageQueueChannels.completed, {
          jobId,
          taskId,
          taskType: 'ai',
          output: result.output,
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
          {
            error: errorMessage,
            stack: (error as Error).stack,
          },
        );

        await messagePublisher.publish(MessageQueueChannels.failed, {
          jobId,
          taskId,
        });

        // Reject the message without requeueing if processing fails.
        messageConsumer.nack(msg, false);
      }
    },
  );

  logger.info(`Waiting for messages in queue: ${MessageQueueChannels.ai}`);

  const port = config.PORT || 3003;
  const server = app.listen(port, () => {
    logger.info(`AI worker service listening on port ${port}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('Server closed.');
      await messageConsumer.close();
      await dbConnection.close();
      logger.info('Shutdown complete.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.fatal('AI worker failed to start', { error });
  process.exit(1);
});
