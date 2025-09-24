import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

import { MediaProcessorError } from '@thumbnail-worker/entities/errors.entity';

import { FfmpegProcessor } from './ffmpeg.media-processor';

jest.mock('fluent-ffmpeg');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const mockedFfmpeg = ffmpeg as jest.Mocked<any>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FfmpegProcessor', () => {
  const sampleVideoPath = 'services/thumbnail-worker/__test__/sample.mp4';
  const outputDir = '/tmp/output';
  let ffmpegProcessor: FfmpegProcessor;

  let onEndCallback: () => void;
  let onErrorCallback: (err: Error) => void;
  let onProgressCallback: (progress: { percent: number }) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    onEndCallback = undefined as any;
    onErrorCallback = undefined as any;
    onProgressCallback = undefined as any;

    const command: any = {
      outputOptions: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn((event, callback) => {
        if (event === 'end') onEndCallback = callback;
        if (event === 'error') onErrorCallback = callback;
        if (event === 'progress') onProgressCallback = callback;
        return command;
      }),
      run: jest.fn(() => {
        // Simulate some progress
        if (onProgressCallback) {
          onProgressCallback({ percent: 50 });
          onProgressCallback({ percent: 100 });
        }
      }),
    };

    mockedFfmpeg.mockReturnValue(command);

    mockedFfmpeg.ffprobe = jest.fn((_path, callback) => {
      callback(null, { format: { duration: 30 } });
    });

    ffmpegProcessor = new FfmpegProcessor();
  });

  it('should generate thumbnails and a VTT file successfully', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

    const processPromise = ffmpegProcessor.process(sampleVideoPath, outputDir);

    // wait for the event loop to handle promise resolutions and set the callback
    await new Promise(process.nextTick);

    // Simulate ffmpeg finishing
    if (onEndCallback) {
      onEndCallback();
    }

    const result = await processPromise;

    expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
      path.join(outputDir, 'thumbnails.vtt'),
      '',
    );

    expect(mockedFfmpeg.ffprobe).toHaveBeenCalledWith(
      sampleVideoPath,
      expect.any(Function),
    );

    expect(mockedFfmpeg).toHaveBeenCalledWith(sampleVideoPath);
    expect(mockedFfmpeg().output).toHaveBeenCalledWith(
      path.join(outputDir, 'thumbnails', 'thumb%04d.jpg'),
    );

    expect(mockedFs.promises.writeFile).toHaveBeenCalled();

    const vttContent = (mockedFs.promises.writeFile as jest.Mock).mock
      .calls[1][1] as string;
    expect(vttContent).toContain('WEBVTT');
    expect(vttContent).toContain('00:00:00.000 --> 00:00:05.000');
    expect(vttContent).toContain('thumbnails/thumb0001.jpg');
    expect(vttContent).toContain('00:00:25.000 --> 00:00:30.000');
    expect(vttContent).toContain('thumbnails/thumb0006.jpg');

    expect(result).toEqual({
      success: true,
      output: {
        paths: {
          vtt: path.join(outputDir, 'thumbnails.vtt'),
          thumbnailsDir: path.join(outputDir, 'thumbnails'),
        },
      },
    });
  });

  it('should handle ffmpeg processing errors', async () => {
    const errorMessage = 'ffmpeg error';

    const processPromise = ffmpegProcessor.process(sampleVideoPath, outputDir);

    // wait for the event loop to handle promise resolutions and set the callback
    await new Promise(process.nextTick);

    // Simulate ffmpeg error
    if (onErrorCallback) {
      onErrorCallback(new Error(errorMessage));
    }

    await expect(processPromise).rejects.toThrow(
      new MediaProcessorError(`Thumbnail generation failed: ${errorMessage}`),
    );
  });

  it('should handle ffprobe errors', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockedFfmpeg.ffprobe = jest.fn((_path, callback) => {
      callback(new Error('ffprobe error'), null);
    });

    // Since ffprobe now returns undefined, it will throw an error.
    await expect(
      ffmpegProcessor.process(sampleVideoPath, outputDir),
    ).rejects.toThrow(
      new MediaProcessorError('Could not determine video duration.'),
    );
    consoleErrorSpy.mockRestore();
  });
});
