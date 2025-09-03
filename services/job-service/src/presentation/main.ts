import 'reflect-metadata';

import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { container } from 'tsyringe';

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
      return res
        .status(400)
        .json({ error: 'mediaId and sourceUrl are required' });
    }

    const createJobUseCase = container.resolve(CreateJobUseCase);
    const job = await createJobUseCase.execute({ mediaId, sourceUrl });

    res.status(201).json({ jobId: job._id });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Job service listening on port ${port}`);
});
