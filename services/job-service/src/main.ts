import 'reflect-metadata';

import express, { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type {
  IMessageConsumer,
  TaskFailedMessage,
} from '@monorepo/message-queue';

import { logger } from '@job-service/adapters/logger.adapter';
import { config } from '@job-service/config';
import { setupDI } from '@job-service/config/di.config';
import { getNextTask } from '@job-service/config/workers.config';
import {
  InvalidArgumentError,
  JobNotFoundError,
} from '@job-service/entities/errors.entity';
import { jobRouter } from '@job-service/routes/job.routes';
import { UpdateJobStatusUseCase } from '@job-service/use-cases/update-job-status.usecase';
import { DI_TOKENS } from '@monorepo/core';

setupDI();

const messageQueue = container.resolve<IMessageConsumer>(
  DI_TOKENS.MessageConsumer,
);
const dbConnection = container.resolve<IDatabaseConnection>(
  DI_TOKENS.DatabaseConnection,
);

const app = express();
app.use(express.json());

// Health check endpoint

async function main() {
  await messageQueue.connect(config.RABBITMQ_URL);

  await dbConnection.connect(config.MONGO_URI);

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  app.use('/api', jobRouter);

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.message, err);

    if (err instanceof InvalidArgumentError) {
      return res.status(400).json({ error: err.message });
    }

    if (err instanceof JobNotFoundError) {
      return res.status(404).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Internal Server Error' });
  });

  const updateJobStatusUseCase = container.resolve(UpdateJobStatusUseCase);

  messageQueue.consume('task_completed', async (content, msg) => {
    if (!msg || !content) {
      return;
    }

    try {
      logger.info('Received task completion message:', content);

      const nextTask = getNextTask(content.taskType);

      if (nextTask) {
        // Start the next task
      } else {
        // This was the last task, mark the job as completed
        await updateJobStatusUseCase.execute({
          jobId: content.jobId,
          status: 'completed',
        });
      }

      messageQueue.ack(msg);
    } catch (error) {
      logger.error('Error processing task completion message:', error);
    }
  });

  messageQueue.consume('task_failed', async (content, msg) => {
    if (!msg || !content) {
      return;
    }

    try {
      const content: TaskFailedMessage = JSON.parse(msg.content.toString());
      logger.info('Received task failure message:', content);

      await updateJobStatusUseCase.execute({
        jobId: content.jobId,
        status: 'failed',
      });

      messageQueue.ack(msg);
    } catch (error) {
      logger.error('Error processing task failure message:', error);
      messageQueue.nack(msg);
    }
  });
}

const port = config.PORT || 3002;

main()
  .then(() => {
    const server = app.listen(port, () => {
      logger.info(`Job service listening on port ${port}`);
    });

    const gracefulShutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed.');

        Promise.all([dbConnection.close(), messageQueue.close()])
          .then(() => {
            logger.info('Disconnected from dependencies.');
            process.exit(0);
          })
          .catch((err) => {
            logger.error('Error during disconnection:', err);
            process.exit(1);
          });
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  })
  .catch((err) => {
    logger.fatal('Failed to start the service:', err);
    process.exit(1);
  });
