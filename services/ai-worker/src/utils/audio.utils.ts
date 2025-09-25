import ffmpeg from 'fluent-ffmpeg';

import { AppError } from '../domain/errors';

/**
 * Gets the duration of an audio file in seconds.
 * @param filePath - The path to the audio file.
 * @returns A promise that resolves with the duration in seconds.
 */
export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(
          new AppError(
            'AudioDurationError',
            `Failed to get duration for ${filePath}`,
            { originalError: err },
          ),
        );
      }
      if (metadata.format.duration) {
        resolve(metadata.format.duration);
      } else {
        reject(
          new AppError(
            'AudioDurationError',
            `Could not find duration for ${filePath}`,
          ),
        );
      }
    });
  });
}
