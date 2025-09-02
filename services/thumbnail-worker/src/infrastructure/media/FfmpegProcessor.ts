import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { injectable } from 'tsyringe';

import { IMediaProcessor } from '@thumbnail-worker/application/ports/IMediaProcessor';

@injectable()
export class FfmpegProcessor implements IMediaProcessor {
  async generateThumbnail(
    videoUrl: string,
    outputDir: string,
  ): Promise<{ thumbnailUrl: string }> {
    const thumbnailsDir = path.join(outputDir, 'thumbnails');
    this._ensureDirectoryExists(outputDir);
    this._ensureDirectoryExists(thumbnailsDir);

    const duration = await this._getVideoDuration(videoUrl);
    if (!duration) {
      throw new Error('Could not determine video duration.');
    }

    const thumbnailCount = Math.ceil(duration / 5); // 5 second interval

    await this._generateThumbnailsFFmpeg(
      videoUrl,
      thumbnailsDir,
      thumbnailCount,
    );

    const thumbnailUrl = path.join(thumbnailsDir, 'thumb0001.jpg');
    return { thumbnailUrl };
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
          reject(err);
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
          `-vf fps=1/5,scale=240:-1`, // Extract frames every 5 seconds and scale
          `-q:v 2`, // High quality
          '-f image2',
        ])
        .output(path.join(thumbnailsDir, 'thumb%04d.jpg'))
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(new Error(`Thumbnail generation failed: ${err.message}`));
        })
        .run();
    });
  }
}
