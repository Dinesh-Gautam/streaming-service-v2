import 'reflect-metadata';

import { ObjectId } from 'mongodb';
import { container } from 'tsyringe';

import type { MockMongoJobAdapter } from '@job-service/adapters/mongo-job.adapter.mock';
import type { MockMessageQueue } from '@monorepo/message-queue';
import type { WorkerTypes } from '@monorepo/workers';

import { setupDI } from '@job-service/config/di.config';
import { JobNotFoundError } from '@job-service/entities/errors.entity';
import { RetryJobUseCase } from '@job-service/use-cases/retry-job.usecase';
import { DI_TOKENS, IJobRepository, MediaJob, MediaTask } from '@monorepo/core';
import {
  IMessagePublisher,
  MessageQueueChannels,
} from '@monorepo/message-queue';

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
      'thumbnail' as WorkerTypes,
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
      MessageQueueChannels.thumbnail,
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
