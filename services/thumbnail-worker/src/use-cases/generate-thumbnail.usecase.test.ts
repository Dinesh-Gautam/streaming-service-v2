import 'reflect-metadata';

import { container } from 'tsyringe';

import type {
  IMediaProcessor,
  ISourceResolver,
  ITaskRepository,
} from '@monorepo/core';
import type { IMessagePublisher } from '@monorepo/message-queue';
import type { ThumbnailOutput, WorkerOutput } from '@monorepo/workers';

import { DI_TOKENS, MediaPrcessorEvent } from '@monorepo/core';
import { MessageQueueChannels } from '@monorepo/message-queue';
import { GenerateThumbnailUseCase } from '@thumbnail-worker/use-cases/generate-thumbnail.usecase';

// Mock implementations
const mockTaskRepository: jest.Mocked<ITaskRepository> = {
  findJobById: jest.fn(),
  updateTaskStatus: jest.fn(),
  updateTaskOutput: jest.fn(),
  failTask: jest.fn(),
};

const mockMediaProcessor: jest.Mocked<IMediaProcessor> = {
  process: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  listeners: jest.fn(),
  listenerCount: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  prependListener: jest.fn(),
  prependOnceListener: jest.fn(),
  setMaxListeners: jest.fn(),
  getMaxListeners: jest.fn(),
  rawListeners: jest.fn(),
  eventNames: jest.fn(),
  addListener: jest.fn(),
};

const mockSourceResolver: jest.Mocked<ISourceResolver> = {
  resolveSource: jest.fn(),
};

const mockMessagePublisher: jest.Mocked<IMessagePublisher> = {
  publish: jest.fn(),
  connect: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn(),
  getChannel: jest.fn(),
};

// DI container setup
container.registerInstance(DI_TOKENS.TaskRepository, mockTaskRepository);
container.registerInstance(DI_TOKENS.MediaProcessor, mockMediaProcessor);
container.registerInstance(DI_TOKENS.SourceResolver, mockSourceResolver);
container.registerInstance(DI_TOKENS.MessagePublisher, mockMessagePublisher);

describe('GenerateThumbnailUseCase', () => {
  let generateThumbnailUseCase: GenerateThumbnailUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    generateThumbnailUseCase = container.resolve(GenerateThumbnailUseCase);
  });

  const input = {
    jobId: 'job-1',
    taskId: 'task-1',
    sourceUrl: 'services/thumbnail-worker/__test__/sample.mp4',
  };

  const resolvedSource = '/resolved/path/to/video.mp4';
  const workerOutput: WorkerOutput<ThumbnailOutput> = {
    success: true,
    output: {
      paths: {
        vtt: '/tmp/output/job-1/thumbnails.vtt',
        thumbnailsDir: '/tmp/output/job-1/thumbnails',
      },
    },
  };

  it('should successfully generate thumbnails and complete the task', async () => {
    // Arrange
    mockSourceResolver.resolveSource.mockResolvedValue(resolvedSource);
    mockMediaProcessor.process.mockResolvedValue(workerOutput);

    // Act
    await generateThumbnailUseCase.execute(input);

    // Assert
    expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      'running',
      0,
    );
    expect(mockSourceResolver.resolveSource).toHaveBeenCalledWith(
      input.sourceUrl,
    );
    expect(mockMediaProcessor.process).toHaveBeenCalledWith(
      resolvedSource,
      `/tmp/output/${input.jobId}`,
    );
    expect(mockTaskRepository.updateTaskOutput).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      workerOutput.output,
    );
    expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      'completed',
      100,
    );
    expect(mockMessagePublisher.publish).toHaveBeenCalledWith(
      MessageQueueChannels.completed,
      {
        jobId: input.jobId,
        taskId: input.taskId,
        status: 'completed',
        output: workerOutput.output,
      },
    );
    expect(mockTaskRepository.failTask).not.toHaveBeenCalled();
  });

  it('should handle media processing errors and fail the task', async () => {
    // Arrange
    const mediaProcessorError = new Error('Media processing failed');
    mockSourceResolver.resolveSource.mockResolvedValue(resolvedSource);
    mockMediaProcessor.process.mockRejectedValue(mediaProcessorError);

    // Act & Assert
    await expect(generateThumbnailUseCase.execute(input)).rejects.toThrow(
      mediaProcessorError,
    );
    expect(mockTaskRepository.failTask).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      mediaProcessorError.message,
    );
    expect(mockTaskRepository.updateTaskOutput).not.toHaveBeenCalled();
    expect(mockMessagePublisher.publish).not.toHaveBeenCalled();
  });

  it('should handle progress updates from the media processor', async () => {
    // Arrange
    mockSourceResolver.resolveSource.mockResolvedValue(resolvedSource);

    mockMediaProcessor.process.mockImplementation(async () => {
      const progressCallback = mockMediaProcessor.on.mock.calls.find(
        (call) => call[0] === MediaPrcessorEvent.Progress,
      )?.[1];

      if (progressCallback) {
        (progressCallback as (progress: number) => void)(50);
      }

      return workerOutput;
    });

    // Act
    await generateThumbnailUseCase.execute(input);

    // Assert
    expect(mockMediaProcessor.on).toHaveBeenCalledWith(
      MediaPrcessorEvent.Progress,
      expect.any(Function),
    );

    expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      'running',
      0,
    );
    expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      'running',
      50,
    );
    expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      'completed',
      100,
    );
  });

  it('should mark task as failed if source resolution fails', async () => {
    // Arrange
    const resolutionError = new Error('Failed to resolve source');
    mockSourceResolver.resolveSource.mockRejectedValue(resolutionError);

    // Act & Assert
    await expect(generateThumbnailUseCase.execute(input)).rejects.toThrow(
      resolutionError,
    );
    expect(mockTaskRepository.failTask).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      resolutionError.message,
    );
    expect(mockMediaProcessor.process).not.toHaveBeenCalled();
    expect(mockMessagePublisher.publish).not.toHaveBeenCalled();
  });
});
