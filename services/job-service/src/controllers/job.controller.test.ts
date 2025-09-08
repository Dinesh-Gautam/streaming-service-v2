import 'reflect-metadata';

import { Request, Response } from 'express';
import { container } from 'tsyringe';

import { JobNotFoundError } from '@job-service/entities/errors.entity';
import { CreateJobUseCase } from '@job-service/use-cases/create-job.usecase';
import { RetryJobUseCase } from '@job-service/use-cases/retry-job.usecase';
import { MediaJob } from '@monorepo/core';

import { JobController } from './job.controller';

// Mock the use cases
const mockCreateJobUseCase = {
  execute: jest.fn(),
};
const mockRetryJobUseCase = {
  execute: jest.fn(),
};

// Mock tsyringe container resolution
container.registerInstance(CreateJobUseCase, mockCreateJobUseCase as any);
container.registerInstance(RetryJobUseCase, mockRetryJobUseCase as any);

describe('JobController', () => {
  let jobController: JobController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jobController = new JobController();

    mockJson = jest.fn();
    mockSend = jest.fn();
    mockStatus = jest.fn(() => ({
      json: mockJson,
      send: mockSend,
    }));

    mockRequest = {};
    mockResponse = {
      status: mockStatus,
    };
  });

  describe('createJob', () => {
    it('should create a job and return 201 status with the job ID', async () => {
      mockRequest.body = {
        mediaId: 'media-123',
        sourceUrl: 'http://a.b/c.mp4',
      };
      const job = new MediaJob('media-123', 'http://a.b/c.mp4', 'pending', []);
      job._id = 'job-id-123' as any;
      mockCreateJobUseCase.execute.mockResolvedValue(job);

      await jobController.createJob(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockCreateJobUseCase.execute).toHaveBeenCalledWith({
        mediaId: 'media-123',
        sourceUrl: 'http://a.b/c.mp4',
        workers: expect.any(Array),
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({ jobId: 'job-id-123' });
    });

    it('should return 400 if mediaId or sourceUrl is missing', async () => {
      mockRequest.body = { mediaId: 'media-123' }; // Missing sourceUrl

      await jobController.createJob(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'mediaId and sourceUrl are required',
      });
    });

    it('should return 500 for internal server errors', async () => {
      mockRequest.body = {
        mediaId: 'media-123',
        sourceUrl: 'http://a.b/c.mp4',
      };
      mockCreateJobUseCase.execute.mockRejectedValue(
        new Error('Internal Error'),
      );

      await jobController.createJob(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });

  describe('retryJob', () => {
    it('should retry a job and return 200 status', async () => {
      mockRequest.params = { mediaId: 'media-123' };
      mockRetryJobUseCase.execute.mockResolvedValue(undefined);

      await jobController.retryJob(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockRetryJobUseCase.execute).toHaveBeenCalledWith({
        mediaId: 'media-123',
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return 404 if the job to retry is not found', async () => {
      mockRequest.params = { mediaId: 'non-existent-id' };
      mockRetryJobUseCase.execute.mockRejectedValue(
        new JobNotFoundError('Job not found'),
      );

      await jobController.retryJob(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Job not found' });
    });

    it('should return 500 for internal server errors during retry', async () => {
      mockRequest.params = { mediaId: 'media-123' };
      mockRetryJobUseCase.execute.mockRejectedValue(
        new Error('Internal Error'),
      );

      await jobController.retryJob(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });
});
