import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { injectable } from 'tsyringe';

import type { IMediaProcessor } from '@monorepo/core';
import type { ThumbnailOutput, WorkerOutput } from '@monorepo/message-queue';

import { logger } from '@thumbnail-worker/config/logger';
import { MediaProcessorError } from '@thumbnail-worker/entities/errors.entity';

interface ThumbnailEngineOptions {
  interval: number;
  thumbnailWidth: number;
  jpegQuality: number;
}

const DEFAULT_OPTIONS: ThumbnailEngineOptions = {
  interval: 5,
  thumbnailWidth: 240,
  jpegQuality: 2,
};

@injectable()
export class FfmpegProcessor extends EventEmitter implements IMediaProcessor {
  private options: ThumbnailEngineOptions;

  constructor(options: Partial<ThumbnailEngineOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async process(
    inputFile: string,
    outputDir: string,
  ): Promise<WorkerOutput<ThumbnailOutput>> {
    const thumbnailsDir = path.join(outputDir, 'thumbnails');
    const vttFilePath = path.join(outputDir, 'thumbnails.vtt');

    this._ensureDirectoryExists(outputDir);
    this._ensureDirectoryExists(thumbnailsDir);

    console.log(__dirname);
    console.log(path.resolve(inputFile));
    logger.info(`Generating thumbnails for ${inputFile} in ${thumbnailsDir}`);

    const duration = await this._getVideoDuration(inputFile);

    if (!duration) {
      throw new MediaProcessorError('Could not determine video duration.');
    }

    const thumbnailCount = Math.ceil(duration / this.options.interval);

    await this._generateThumbnailsFFmpeg(
      inputFile,
      thumbnailsDir,
      thumbnailCount,
    );

    this._generateVttFile(
      thumbnailCount,
      this.options.interval,
      duration,
      outputDir,
      thumbnailsDir,
      vttFilePath,
    );

    return {
      success: true,
      output: {
        paths: {
          vtt: vttFilePath,
          thumbnailsDir: thumbnailsDir,
        },
      },
    };
  }

  private _ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private _getVideoDuration(videoPath: string): Promise<number | undefined> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error(`[FfmpegProcessor] ffprobe error:`, err);
          resolve(undefined);
          return;
        }
        resolve(metadata.format.duration);
      });
    });
  }

  private _generateThumbnailsFFmpeg(
    inputPath: string,
    thumbnailsDir: string,
    thumbnailCount: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf fps=1/${this.options.interval},scale=${this.options.thumbnailWidth}:-1`,
          `-q:v ${this.options.jpegQuality}`,
          '-f image2',
        ])
        .output(path.join(thumbnailsDir, 'thumb%04d.jpg'))
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(
            new MediaProcessorError(
              `Thumbnail generation failed: ${err.message}`,
            ),
          );
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.emit('progress', progress.percent);
          }
        })
        .run();
    });
  }

  private _generateVttFile(
    thumbnailCount: number,
    interval: number,
    duration: number,
    outputDir: string,
    thumbnailsDir: string,
    vttFilePath: string,
  ): void {
    let vttContent = 'WEBVTT\n\n';
    const relativeThumbnailsPath = path
      .relative(outputDir, thumbnailsDir)
      .replace(/\\/g, '/');

    const mediaId = path.basename(outputDir);

    for (let i = 0; i < thumbnailCount; i++) {
      const startTime = i * interval;
      const endTime = i === thumbnailCount - 1 ? duration : (i + 1) * interval;

      const startTimeFormatted = this._formatVttTime(startTime);
      const endTimeFormatted = this._formatVttTime(endTime);

      const thumbnailUrl = `${relativeThumbnailsPath}/thumb${(i + 1)
        .toString()
        .padStart(4, '0')}.jpg`;

      vttContent += `${startTimeFormatted} --> ${endTimeFormatted}\n`;
      vttContent += `${thumbnailUrl}\n\n`;
    }

    fs.writeFileSync(vttFilePath, vttContent);
  }

  private _formatVttTime(seconds: number): string {
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${secs}.${ms}`;
  }
}
