import 'reflect-metadata';

import { container } from 'tsyringe';

import type {
  IMediaProcessor,
  IStorage,
  ITaskRepository,
} from '@monorepo/core';
import type { ThumbnailOutput, WorkerOutput } from '@monorepo/workers';

import { DI_TOKENS, MediaPrcessorEvent } from '@monorepo/core';
import { GenerateThumbnailUseCase } from '@thumbnail-worker/use-cases/generate-thumbnail.usecase';

jest.mock('@thumbnail-worker/config', () => ({
  config: {
    TEMP_OUT_DIR: '/tmp/output',
  },
}));

// Mock implementations
const mockTaskRepository: jest.Mocked<ITaskRepository> = {
  findJobById: jest.fn(),
  updateTaskStatus: jest.fn(),
  updateTaskOutput: jest.fn(),
  failTask: jest.fn(),
};

const mockMediaProcessor: jest.Mocked<IMediaProcessor<ThumbnailOutput>> = {
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

const mockStorage: jest.Mocked<IStorage> = {
  downloadFile: jest.fn(),
  saveFile: jest.fn(),
  writeFile: jest.fn(),
};

// DI container setup
container.registerInstance(DI_TOKENS.TaskRepository, mockTaskRepository);
container.registerInstance(DI_TOKENS.MediaProcessor, mockMediaProcessor);
container.registerInstance(DI_TOKENS.Storage, mockStorage);

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

  const tempInputPath = '/tmp/sample.mp4';
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
    mockStorage.downloadFile.mockResolvedValue(tempInputPath);
    mockMediaProcessor.process.mockResolvedValue(workerOutput);
    mockStorage.saveFile.mockImplementation(async (sourcePath) => sourcePath);

    // Act
    const result = await generateThumbnailUseCase.execute(input);

    // Assert
    expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      'running',
      0,
    );
    expect(mockStorage.downloadFile).toHaveBeenCalledWith(input.sourceUrl);
    expect(mockMediaProcessor.process).toHaveBeenCalledWith(
      tempInputPath,
      `/tmp/output/${input.jobId}`,
    );
    expect(mockStorage.saveFile).toHaveBeenCalledWith(
      workerOutput.output.paths.vtt,
      `${input.jobId}/thumbnails.vtt`,
    );
    expect(mockStorage.saveFile).toHaveBeenCalledWith(
      workerOutput.output.paths.thumbnailsDir,
      `${input.jobId}/thumbnails`,
    );

    expect(result.output.paths.vtt).toEqual(workerOutput.output.paths.vtt);
    expect(result.output.paths.thumbnailsDir).toEqual(
      workerOutput.output.paths.thumbnailsDir,
    );

    expect(mockTaskRepository.failTask).not.toHaveBeenCalled();
  });

  it('should handle media processing errors and fail the task', async () => {
    // Arrange
    const mediaProcessorError = new Error('Media processing failed');
    mockStorage.downloadFile.mockResolvedValue(tempInputPath);
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
  });

  it('should handle progress updates from the media processor', async () => {
    // Arrange
    mockStorage.downloadFile.mockResolvedValue(tempInputPath);
    mockMediaProcessor.process.mockImplementation(async () => {
      const progressCallback = mockMediaProcessor.on.mock.calls.find(
        (call) => call[0] === MediaPrcessorEvent.Progress,
      )?.[1];

      if (progressCallback) {
        (progressCallback as (progress: number) => void)(50);
      }

      return workerOutput;
    });
    mockStorage.saveFile.mockImplementation(async (sourcePath) => sourcePath);

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
  });

  it('should mark task as failed if source download fails', async () => {
    // Arrange
    const downloadError = new Error('Failed to download source');
    mockStorage.downloadFile.mockRejectedValue(downloadError);

    // Act & Assert
    await expect(generateThumbnailUseCase.execute(input)).rejects.toThrow(
      downloadError,
    );
    expect(mockTaskRepository.failTask).toHaveBeenCalledWith(
      input.jobId,
      input.taskId,
      downloadError.message,
    );
    expect(mockMediaProcessor.process).not.toHaveBeenCalled();
  });
});
