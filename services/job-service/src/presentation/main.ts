import 'reflect-metadata';

import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { container } from 'tsyringe';

import { InvalidArgumentError } from '@job-service/domain/entities/errors';
import { logger } from '@job-service/infrastructure/logger';
import { DatabaseConnection } from '@monorepo/database';
import { IMessagePublisher, RabbitMQAdapter } from '@monorepo/message-queue';

import { CreateJobUseCase } from '../application/use-cases/create-job';
import { IJobRepository } from '../domain/repositories/job-repository';
import { MongoJobRepository } from '../infrastructure/persistence/mongo-job-repository';

dotenv.config();

container.registerSingleton<DatabaseConnection>(
  'DatabaseConnection',
  DatabaseConnection,
);
container.registerSingleton<IJobRepository>(
  'JobRepository',
  MongoJobRepository,
);
container.registerSingleton<IMessagePublisher>(
  'MessagePublisher',
  RabbitMQAdapter,
);

const app = express();
app.use(express.json());

const port = process.env.PORT || 3002;

// --- API Endpoints ---

app.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { mediaId, sourceUrl } = req.body;

    if (!mediaId || !sourceUrl) {
      throw new InvalidArgumentError('mediaId and sourceUrl are required');
    }

    const createJobUseCase = container.resolve(CreateJobUseCase);
    const job = await createJobUseCase.execute({
      mediaId,
      sourceUrl,
      engines: [{ name: 'ThumbnailEngine', type: 'thumbnail' }],
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

app.listen(port, () => {
  logger.info(`Job service listening on port ${port}`);
});
