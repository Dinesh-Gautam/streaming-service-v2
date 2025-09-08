import 'reflect-metadata';

import { ObjectId } from 'mongodb';
import { container } from 'tsyringe';

import type { MockMessageQueue, WorkerTypes } from '@monorepo/message-queue';

import { setupDI } from '@job-service/config/di.config';
import { DI_TOKENS, IJobRepository, MediaJob } from '@monorepo/core';
import {
  IMessagePublisher,
  MessageQueueChannels,
} from '@monorepo/message-queue';

import { MockMongoJobAdapter } from '../adapters/mongo-job.adapter.mock';
import { CreateJobUseCase } from './create-job.usecase';

describe('CreateJobUseCase', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    setupDI();
  });

  let createJobUseCase: CreateJobUseCase;
  let jobRepository: MockMongoJobAdapter;
  let messagePublisher: MockMessageQueue;

  beforeEach(() => {
    container.clearInstances();
    createJobUseCase = container.resolve(CreateJobUseCase);
    jobRepository = container.resolve<IJobRepository>(
      DI_TOKENS.JobRepository,
    ) as MockMongoJobAdapter;
    messagePublisher = container.resolve<IMessagePublisher>(
      DI_TOKENS.MessagePublisher,
    ) as MockMessageQueue;
  });

  it('should create a new job and publish a message', async () => {
    const input = {
      mediaId: 'media-123',
      sourceUrl: 'http://example.com/video.mp4',
      workers: [{ name: 'thumbnail', type: 'thumbnail-worker' as WorkerTypes }],
    };

    jobRepository.getJobByMediaId.mockResolvedValue(null);
    jobRepository.save.mockImplementation((job) => {
      job._id = new ObjectId();
      return Promise.resolve(job);
    });

    const result = await createJobUseCase.execute(input);

    expect(result).toBeInstanceOf(MediaJob);
    expect(result.mediaId).toBe(input.mediaId);
    expect(result.status).toBe('pending');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].worker).toBe('thumbnail' as WorkerTypes);

    expect(messagePublisher.publish).toHaveBeenCalledTimes(1);
    expect(messagePublisher.publish).toHaveBeenCalledWith(
      MessageQueueChannels['thumbnail'],
      expect.objectContaining({
        jobId: result._id,
        sourceUrl: input.sourceUrl,
      }),
    );
  });

  it('should return an existing job if one already exists', async () => {
    const existingJob = new MediaJob(
      'media-123',
      'http://example.com/video.mp4',
      'completed',
      [],
    );
    existingJob._id = new ObjectId();
    jobRepository.getJobByMediaId.mockResolvedValue(existingJob);

    const input = {
      mediaId: 'media-123',
      sourceUrl: 'http://example.com/video.mp4',
      workers: [{ name: 'thumbnail', type: 'thumbnail-worker' as WorkerTypes }],
    };

    const result = await createJobUseCase.execute(input);

    expect(result).toBe(existingJob);
    expect(messagePublisher.publish).not.toHaveBeenCalled();
  });
});
