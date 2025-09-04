import { Request, Response } from 'express';
import { container } from 'tsyringe';

import { logger } from '@job-service/adapters/logger.adapter';
import { WORKERS } from '@job-service/config/workers.config';
import {
  InvalidArgumentError,
  JobNotFoundError,
} from '@job-service/entities/errors.entity';
import { CreateJobUseCase } from '@job-service/use-cases/create-job.usecase';
import { RetryJobUseCase } from '@job-service/use-cases/retry-job.usecase';

export class JobController {
  async createJob(req: Request, res: Response): Promise<Response> {
    try {
      const { mediaId, sourceUrl } = req.body;

      if (!mediaId || !sourceUrl) {
        throw new InvalidArgumentError('mediaId and sourceUrl are required');
      }

      const createJobUseCase = container.resolve(CreateJobUseCase);
      const job = await createJobUseCase.execute({
        mediaId,
        sourceUrl,
        workers: WORKERS,
      });

      return res.status(201).json({ jobId: job._id });
    } catch (error) {
      logger.error('Error creating job:', error);

      if (error instanceof InvalidArgumentError) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async retryJob(req: Request, res: Response): Promise<Response> {
    try {
      const { mediaId } = req.params;

      const retryJobUseCase = container.resolve(RetryJobUseCase);
      await retryJobUseCase.execute({ mediaId });

      return res.status(200).send();
    } catch (error) {
      logger.error('Error retrying job:', error);

      if (error instanceof JobNotFoundError) {
        return res.status(404).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
