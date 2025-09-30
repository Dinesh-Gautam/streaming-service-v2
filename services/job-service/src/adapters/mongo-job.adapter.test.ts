import 'reflect-metadata';

import { ObjectId } from 'mongodb';
import { container } from 'tsyringe';

import { DI_TOKENS, MediaJob, TaskStatus } from '@monorepo/core';
import { IDatabaseConnection } from '@monorepo/database';

import { MongoJobRepository } from './mongo-job.adapter';

const mockCollection = {
  updateOne: jest.fn(),
  insertOne: jest.fn(),
  findOne: jest.fn(),
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
};

const mockDbConnection = {
  getDb: jest.fn(() => mockDb),
};

container.register(DI_TOKENS.DatabaseConnection, {
  useValue: mockDbConnection as unknown as IDatabaseConnection,
});

describe('MongoJobRepository', () => {
  let repository: MongoJobRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = container.resolve(MongoJobRepository);
  });

  describe('save', () => {
    it('should insert a new job if no _id is provided', async () => {
      const job = new MediaJob('media-123', 'http://a.b/c.mp4', 'pending', []);
      const insertedId = new ObjectId();
      mockCollection.insertOne.mockResolvedValue({ insertedId });

      const result = await repository.save(job);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(job);
      expect(result._id).toBe(insertedId);
    });

    it('should update an existing job if an _id is provided', async () => {
      const job = new MediaJob('media-123', 'http://a.b/c.mp4', 'pending', []);
      job._id = new ObjectId();
      const { _id, ...jobData } = job;

      await repository.save(job);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id },
        { $set: jobData },
        { upsert: true },
      );
    });
  });

  describe('getJobById', () => {
    it('should return a job by its ID', async () => {
      const jobId = new ObjectId();
      const jobData = {
        _id: jobId,
        mediaId: 'media-123',
        sourceUrl: 'http://a.b/c.mp4',
        status: 'pending',
        tasks: [],
      };
      mockCollection.findOne.mockResolvedValue(jobData);

      const result = await repository.getJobById(jobId.toHexString());

      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: jobId });
      expect(result).toBeInstanceOf(MediaJob);
      expect(result?.mediaId).toBe(jobData.mediaId);
    });

    it('should return null if job is not found by ID', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const result = await repository.getJobById(new ObjectId().toHexString());
      expect(result).toBeNull();
    });
  });

  describe('getJobByMediaId', () => {
    it('should return a job by its mediaId', async () => {
      const mediaId = 'media-123';
      const jobData = {
        _id: new ObjectId(),
        mediaId,
        sourceUrl: 'http://a.b/c.mp4',
        status: 'pending',
        tasks: [],
      };
      mockCollection.findOne.mockResolvedValue(jobData);

      const result = await repository.getJobByMediaId(mediaId);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ mediaId });
      expect(result).toBeInstanceOf(MediaJob);
      expect(result?.mediaId).toBe(mediaId);
    });

    it('should return null if job is not found by mediaId', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const result = await repository.getJobByMediaId('non-existent-media-id');
      expect(result).toBeNull();
    });
  });
});
