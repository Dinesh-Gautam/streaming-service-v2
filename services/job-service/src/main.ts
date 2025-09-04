import 'reflect-metadata';

import express, { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';

import type { IJobRepository, JobStatus, WorkerTypes } from '@monorepo/core';
import type { IDatabaseConnection } from '@monorepo/database';
import type { IMessageConsumer } from '@monorepo/message-queue';

import { logger } from '@job-service/adapters/logger.adapter';
import { MongoJobRepository } from '@job-service/adapters/mongo-job.adapter';
import { config, DI_TOKENS } from '@job-service/config';
import {
  InvalidArgumentError,
  JobNotFoundError,
} from '@job-service/entities/errors.entity';
import { jobRouter } from '@job-service/presentation/routes/job.routes';
import { UpdateJobStatusUseCase } from '@job-service/use-cases/update-job-status.usecase';
import { getNextTask } from '@job-service/workers.config';
import { MessageQueueChannels } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { IMessagePublisher, RabbitMQAdapter } from '@monorepo/message-queue';

export type TaskCompletedMessage = {
  jobId: string;
  taskId: string;
  taskType: WorkerTypes;
};

export type TaskFailedMessage = {
  jobId: string;
  taskId: string;
};

container.registerSingleton<IDatabaseConnection>(
  DI_TOKENS.DatabaseConnection,
  MongoDbConnection,
);
container.registerSingleton<IJobRepository>(
  DI_TOKENS.JobRepository,
  MongoJobRepository,
);
container.registerSingleton<IMessagePublisher>(
  DI_TOKENS.MessagePublisher,
  RabbitMQAdapter,
);
container.registerSingleton<IMessageConsumer>(
  DI_TOKENS.MessageConsumer,
  RabbitMQAdapter,
);

const app = express();
app.use(express.json());

// Health check endpoint
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

const messageQueue = container.resolve<IMessageConsumer>(
  DI_TOKENS.MessageConsumer,
);
const updateJobStatusUseCase = container.resolve(UpdateJobStatusUseCase);

messageQueue.consume(MessageQueueChannels.TaskCompleted, async (msg) => {
  if (msg === null) {
    return;
  }

  try {
    const content: TaskCompletedMessage = JSON.parse(msg.content.toString());
    logger.info('Received task completion message:', content);

    const nextTask = getNextTask(content.taskType);

    if (nextTask) {
      // Start the next task
    } else {
      // This was the last task, mark the job as completed
      await updateJobStatusUseCase.execute({
        jobId: content.jobId,
        status: 'completed' as JobStatus,
      });
    }

    messageQueue.ack(msg);
  } catch (error) {
    logger.error('Error processing task completion message:', error);
  }
});

messageQueue.consume(MessageQueueChannels.TaskFailed, async (msg) => {
  if (msg === null) {
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

const port = config.PORT || 3002;
const server = app.listen(port, () => {
  logger.info(`Job service listening on port ${port}`);
});

const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    // Disconnect from database and message queue
    const dbConnection = container.resolve<IDatabaseConnection>(
      DI_TOKENS.DatabaseConnection,
    );
    const mqConnection = container.resolve<IMessageConsumer>(
      DI_TOKENS.MessageConsumer,
    );
    Promise.all([dbConnection.close(), mqConnection.close()])
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
