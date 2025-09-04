import 'reflect-metadata';

import { ObjectId } from 'mongodb';
import { container } from 'tsyringe';

import type { MockMessageQueue } from '@monorepo/message-queue';

import { DI_TOKENS } from '@job-service/config';
import { setupDI } from '@job-service/di-container';
import { JobNotFoundError } from '@job-service/entities/errors.entity';
import {
  IJobRepository,
  MediaJob,
  MediaTask,
  MessageQueueChannels,
  WorkerTypes,
} from '@monorepo/core';
import { IMessagePublisher } from '@monorepo/message-queue';

import { MockMongoJobAdapter } from '../adapters/mongo-job.adapter.mock';
import { RetryJobUseCase } from './retry-job.usecase';

describe('RetryJobUseCase', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    setupDI();
  });

  let retryJobUseCase: RetryJobUseCase;
  let jobRepository: MockMongoJobAdapter;
  let messagePublisher: MockMessageQueue;

  beforeEach(() => {
    container.clearInstances();
    retryJobUseCase = container.resolve(RetryJobUseCase);
    jobRepository = container.resolve<IJobRepository>(
      DI_TOKENS.JobRepository,
    ) as MockMongoJobAdapter;
    messagePublisher = container.resolve<IMessagePublisher>(
      DI_TOKENS.MessagePublisher,
    ) as MockMessageQueue;
  });

  it('should retry a failed job, reset its status and tasks, and publish a message', async () => {
    const failedTask = new MediaTask(
      'task-1',
      'thumbnail-worker' as WorkerTypes,
      'failed',
    );
    const job = new MediaJob('media-123', 'http://a.b/c.mp4', 'failed', [
      failedTask,
    ]);
    job._id = new ObjectId();
    jobRepository.getJobByMediaId.mockResolvedValue(job);
    jobRepository.save.mockImplementation((job) => Promise.resolve(job));

    const input = { mediaId: 'media-123' };
    await retryJobUseCase.execute(input);

    expect(jobRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
      }),
    );

    expect(messagePublisher.publish).toHaveBeenCalledTimes(1);
    expect(messagePublisher.publish).toHaveBeenCalledWith(
      MessageQueueChannels['thumbnail-worker'],
      expect.anything(),
    );
  });

  it('should not retry a job that is not in a failed state', async () => {
    const job = new MediaJob('media-123', 'http://a.b/c.mp4', 'completed', []);
    jobRepository.getJobByMediaId.mockResolvedValue(job);

    const input = { mediaId: 'media-123' };
    await retryJobUseCase.execute(input);

    expect(messagePublisher.publish).not.toHaveBeenCalled();
  });

  it('should throw an error if the job is not found', async () => {
    jobRepository.getJobByMediaId.mockResolvedValue(null);
    const input = { mediaId: 'non-existent-id' };

    await expect(retryJobUseCase.execute(input)).rejects.toThrow(
      JobNotFoundError,
    );
  });
});
