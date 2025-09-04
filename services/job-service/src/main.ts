import 'reflect-metadata';

import express, { Request, Response } from 'express';
import { container } from 'tsyringe';

import type { IJobRepository, JobStatus, WorkerTypes } from '@monorepo/core';
import type { IDatabaseConnection } from '@monorepo/database';
import type { IMessageConsumer } from '@monorepo/message-queue';

import { logger } from '@job-service/adapters/logger.adapter';
import { MongoJobRepository } from '@job-service/adapters/mongo-job.adapter';
import { config, DI_TOKENS } from '@job-service/config';
import { InvalidArgumentError } from '@job-service/entities/errors.entity';
import { CreateJobUseCase } from '@job-service/use-cases/create-job.usecase';
import { UpdateJobStatusUseCase } from '@job-service/use-cases/update-job-status.usecase';
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

// --- API Endpoints ---

const createJobUseCase = container.resolve(CreateJobUseCase);
const updateJobStatusUseCase = container.resolve(UpdateJobStatusUseCase);

const messageQueue = container.resolve<IMessageConsumer>(
  DI_TOKENS.MessageConsumer,
);

const workers = [
  {
    name: 'ThumbnailWorker',
    type: 'thumbnail-worker',
  } as const,
];

app.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { mediaId, sourceUrl } = req.body;

    if (!mediaId || !sourceUrl) {
      throw new InvalidArgumentError('mediaId and sourceUrl are required');
    }

    const job = await createJobUseCase.execute({
      mediaId,
      sourceUrl,
      workers,
    });

    res.status(201).json({ jobId: job._id });
  } catch (error) {
    logger.error('Error creating job:', error);

    if (error instanceof InvalidArgumentError) {
      res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// consume for task completion events

messageQueue.consume(MessageQueueChannels.TaskCompleted, async (msg) => {
  if (msg === null) {
    return;
  }

  try {
    const content: TaskCompletedMessage = JSON.parse(msg.content.toString());
    logger.info('Received task completion message:', content);

    const lastTask = workers[workers.length - 1];

    if (content.taskType === lastTask.type) {
      // If the completed task is the last one, mark the job as completed
      await updateJobStatusUseCase.execute({
        jobId: content.jobId,
        status: 'completed' as JobStatus,
      });
    }

    if (content.taskType === 'thumbnail-worker') {
      // start next task,
    }

    if (content.taskType === 'transcode-worker') {
      // start next task,
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
app.listen(port, () => {
  logger.info(`Job service listening on port ${port}`);
});
