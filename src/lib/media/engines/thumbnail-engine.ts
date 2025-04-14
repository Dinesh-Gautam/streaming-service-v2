import * as fs from 'fs';
import * as path from 'path';

import ffmpeg from 'fluent-ffmpeg';

import { MediaEngine, MediaEngineProgressDetail } from '../media-engine';

// Default options for the thumbnail engine
interface ThumbnailEngineOptions {
  interval: number; // Interval between thumbnails in seconds
  thumbnailWidth: number; // Width of thumbnails in pixels
  jpegQuality: number; // JPEG quality (1-31, lower is better)
}

const DEFAULT_OPTIONS: ThumbnailEngineOptions = {
  interval: 5,
  thumbnailWidth: 240,
  jpegQuality: 2, // High quality
};

export class ThumbnailEngine extends MediaEngine {
  private options: ThumbnailEngineOptions;

  constructor(options: Partial<ThumbnailEngineOptions> = {}) {
    super('ThumbnailEngine');
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async process(
    inputFile: string,
    outputDir: string,
    // We don't use the third 'options' param here, relying on constructor options
  ): Promise<void> {
    this.updateStatus('running');
    this._progress = 0; // Reset progress
    this._errorMessage = null;

    const thumbnailsDir = path.join(outputDir, 'thumbnails');
    const vttFilePath = path.join(outputDir, 'thumbnails.vtt');

    try {
      // Ensure output directories exist
      this._ensureDirectoryExists(outputDir);
      this._ensureDirectoryExists(thumbnailsDir);

      // 1. Get video duration
      const duration = await this._getVideoDuration(inputFile);
      if (!duration) {
        throw new Error('Could not determine video duration.');
      }
      console.log(`[${this.engineName}] Video duration: ${duration} seconds`);

      // 2. Calculate thumbnail count
      const thumbnailCount = Math.ceil(duration / this.options.interval);
      console.log(
        `[${this.engineName}] Generating ${thumbnailCount} thumbnails...`,
      );

      // 3. Generate thumbnails using ffmpeg
      await this._generateThumbnailsFFmpeg(
        inputFile,
        thumbnailsDir,
        thumbnailCount,
      );

      // 4. Generate VTT file
      this._generateVttFile(
        thumbnailCount,
        this.options.interval,
        duration,
        outputDir,
        thumbnailsDir, // Pass thumbnailsDir to construct relative paths correctly
        vttFilePath,
      );

      // 5. Mark as complete
      this.complete(); // Sets progress to 100 and status to 'completed'
    } catch (error: any) {
      this.fail(error);
      // Re-throw the error so the MediaManager knows the step failed
      throw error;
    }
  }

  private _ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      console.log(`[${this.engineName}] Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private _getVideoDuration(videoPath: string): Promise<number | undefined> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error(`[${this.engineName}] ffprobe error:`, err);
          // Resolve with undefined instead of rejecting to handle it gracefully upstream
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
          `-vf fps=1/${this.options.interval},scale=${this.options.thumbnailWidth}:-1`, // Extract frames and scale
          `-q:v ${this.options.jpegQuality}`, // JPEG quality
          '-f image2',
        ])
        .output(path.join(thumbnailsDir, 'thumb%04d.jpg'))
        .on('end', () => {
          console.log(`[${this.engineName}] Thumbnail generation complete.`);
          resolve();
        })
        .on('error', (err) => {
          console.error(
            `[${this.engineName}] Error generating thumbnails:`,
            err,
          );
          reject(new Error(`Thumbnail generation failed: ${err.message}`));
        })
        .on('progress', (progress) => {
          const currentProgress = this.getProgress();

          if (progress.percent && progress.percent - currentProgress > 5)
            this.updateProgress({
              percent: Math.max(progress.percent - 2, 0),
            });
        })
        .run();
    });
  }

  private _generateVttFile(
    thumbnailCount: number,
    interval: number,
    duration: number,
    outputDir: string, // Base output directory for playback path calculation
    thumbnailsDir: string, // Specific directory where thumbs are saved
    vttFilePath: string,
  ): void {
    let vttContent = 'WEBVTT\n\n';
    const relativeThumbnailsPath = path
      .relative(outputDir, thumbnailsDir)
      .replace(/\\/g, '/'); // Get relative path like 'thumbnails'

    // Extract the media ID (parent directory name of outputDir) for the API path
    const mediaId = path.basename(outputDir);

    for (let i = 0; i < thumbnailCount; i++) {
      const startTime = i * interval;
      const endTime = i === thumbnailCount - 1 ? duration : (i + 1) * interval;

      const startTimeFormatted = this._formatVttTime(startTime);
      const endTimeFormatted = this._formatVttTime(endTime);

      // Construct the URL path relative to the static serving endpoint
      // Assumes API route like /api/static/playback/[mediaId]/thumbnails/thumbXXXX.jpg
      const thumbnailUrl = `/api/static/playback/${mediaId}/${relativeThumbnailsPath}/thumb${(
        i + 1
      )
        .toString()
        .padStart(4, '0')}.jpg`;

      vttContent += `${startTimeFormatted} --> ${endTimeFormatted}\n`;
      vttContent += `${thumbnailUrl}\n\n`;
    }

    try {
      fs.writeFileSync(vttFilePath, vttContent);
      console.log(`[${this.engineName}] WebVTT file created: ${vttFilePath}`);
    } catch (error: any) {
      console.error(`[${this.engineName}] Error writing VTT file:`, error);
      // This error should ideally be caught by the main try/catch in process()
      throw new Error(`Failed to write VTT file: ${error.message}`);
    }
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
