import 'reflect-metadata';

import { ObjectId } from 'mongodb';
import { container } from 'tsyringe';

import { DI_TOKENS } from '@job-service/config';
import { setupDI } from '@job-service/di-container';
import { JobNotFoundError } from '@job-service/entities/errors.entity';
import { IJobRepository, JobStatus, MediaJob } from '@monorepo/core';

import { MockMongoJobAdapter } from '../adapters/mongo-job.adapter.mock';
import { UpdateJobStatusUseCase } from './update-job-status.usecase';

describe('UpdateJobStatusUseCase', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    setupDI();
  });

  let updateJobStatusUseCase: UpdateJobStatusUseCase;
  let jobRepository: MockMongoJobAdapter;

  beforeEach(() => {
    container.clearInstances();
    updateJobStatusUseCase = container.resolve(UpdateJobStatusUseCase);
    jobRepository = container.resolve<IJobRepository>(
      DI_TOKENS.JobRepository,
    ) as MockMongoJobAdapter;
  });

  it('should update the status of an existing job', async () => {
    const job = new MediaJob('media-123', 'http://a.b/c.mp4', 'pending', []);
    job._id = new ObjectId();
    jobRepository.getJobById.mockResolvedValue(job);
    jobRepository.save.mockImplementation((job) => Promise.resolve(job));

    const input = {
      jobId: job._id.toHexString(),
      status: 'completed' as JobStatus,
    };

    await updateJobStatusUseCase.execute(input);

    expect(jobRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
      }),
    );
  });

  it('should throw an error if the job is not found', async () => {
    jobRepository.getJobById.mockResolvedValue(null);
    const input = {
      jobId: 'non-existent-id',
      status: 'completed' as JobStatus,
    };

    await expect(updateJobStatusUseCase.execute(input)).rejects.toThrow(
      JobNotFoundError,
    );
  });
});
