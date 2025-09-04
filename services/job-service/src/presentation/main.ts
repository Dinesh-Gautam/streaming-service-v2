import 'reflect-metadata';

import express, { Request, Response } from 'express';
import { container } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type { IMessageConsumer } from '@monorepo/message-queue';

import { InvalidArgumentError } from '@job-service/domain/entities/errors';
import { config, DI_TOKENS } from '@job-service/infrastructure/config';
import { logger } from '@job-service/infrastructure/logger';
import { MongoDbConnection } from '@monorepo/database';
import { IMessagePublisher, RabbitMQAdapter } from '@monorepo/message-queue';

import { CreateJobUseCase } from '../application/use-cases/create-job';
import { IJobRepository } from '../domain/repositories/job-repository';
import { MongoJobRepository } from '../infrastructure/persistence/mongo-job-repository';

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

const messageQueue = container.resolve<IMessageConsumer>(
  DI_TOKENS.MessageConsumer,
);

messageQueue.consume('task-completed', async (msg) => {
  if (msg === null) {
    return;
  }

  try {
    const content = JSON.parse(msg.content.toString());
    logger.info('Received task completion message:', content);

    // Here you would typically update the job/task status in the database
    // For example:
    // await jobRepository.updateTaskStatus(content.jobId, content.taskId, content.status, content.errorMessage);

    // messageQueue.ack(msg);
  } catch (error) {
    logger.error('Error processing task completion message:', error);
    // Optionally, you might want to nack the message or move it to a dead-letter queue
  }
});

const port = config.PORT || 3002;
app.listen(port, () => {
  logger.info(`Job service listening on port ${port}`);
});
