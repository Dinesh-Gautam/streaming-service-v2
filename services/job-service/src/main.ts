import 'reflect-metadata';

import express, { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type { IMessageConsumer } from '@monorepo/message-queue';

import { logger } from '@job-service/adapters/logger.adapter';
import { config } from '@job-service/config';
import { setupDI } from '@job-service/config/di.config';
import { getNextTask } from '@job-service/config/workers.config';
import {
  InvalidArgumentError,
  JobNotFoundError,
} from '@job-service/entities/errors.entity';
import { jobRouter } from '@job-service/routes/job.routes';
import { TaskDispatcher } from '@job-service/services/task-dispatcher.service';
import { UpdateJobStatusUseCase } from '@job-service/use-cases/update-job-status.usecase';
import { TaskPayloadFactory } from '@job-service/utils/task-payload.factory';
import { DI_TOKENS, ITaskRepository } from '@monorepo/core';

setupDI();

const messageConsumer = container.resolve<IMessageConsumer>(
  DI_TOKENS.MessageConsumer,
);

const dbConnection = container.resolve<IDatabaseConnection>(
  DI_TOKENS.DatabaseConnection,
);

const app = express();
app.use(express.json());

// Health check endpoint

async function main() {
  await messageConsumer.connect(config.RABBITMQ_URL);

  await dbConnection.connect(config.MONGO_URL);

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

  messageConsumer.consume('task_completed', async (content, msg) => {
    if (!msg || !content) {
      return;
    }

    try {
      logger.info('Received task completion message:', content);

      const taskRepository = container.resolve<ITaskRepository>(
        DI_TOKENS.TaskRepository,
      );

      await taskRepository.updateTaskStatus(
        content.jobId,
        content.taskId,
        'completed',
        100,
      );
      await taskRepository.updateTaskOutput(
        content.jobId,
        content.taskId,
        content.output,
      );

      const nextTask = getNextTask(content.taskType);

      if (nextTask) {
        const job = await taskRepository.findJobById(content.jobId);
        if (!job) {
          logger.error(`Job with id ${content.jobId} not found`);
          return;
        }

        const nextPendingTask = job.tasks.find(
          (task) => task.status === 'pending',
        );

        if (nextPendingTask) {
          const payload = TaskPayloadFactory.create(
            job,
            nextPendingTask,
            content.taskType,
            content.output,
          );
          const taskDispatcher = container.resolve(TaskDispatcher);
          await taskDispatcher.dispatch(nextPendingTask, payload);
        } else {
          await updateJobStatusUseCase.execute({
            jobId: content.jobId,
            status: 'completed',
          });
        }
      } else {
        await updateJobStatusUseCase.execute({
          jobId: content.jobId,
          status: 'completed',
        });
      }

      messageConsumer.ack(msg);
    } catch (error) {
      logger.error('Error processing task completion message:', error);
    }
  });

  messageConsumer.consume('task_failed', async (content, msg) => {
    if (!msg || !content) {
      return;
    }

    try {
      logger.info('Received task failure message:', content);

      await updateJobStatusUseCase.execute({
        jobId: content.jobId,
        status: 'failed',
      });

      messageConsumer.ack(msg);
    } catch (error) {
      logger.error('Error processing task failure message:', error);
      messageConsumer.nack(msg);
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

        Promise.all([dbConnection.close(), messageConsumer.close()])
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
