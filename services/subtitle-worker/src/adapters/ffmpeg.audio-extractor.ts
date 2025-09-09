import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { injectable } from 'tsyringe';

import { IAudioExtractor } from '@monorepo/core';

@injectable()
export class FFmpegAudioExtractor
  extends EventEmitter
  implements IAudioExtractor
{
  public extractAudio(inputFile: string, outputDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputFilePath = `${outputDir}/${randomUUID()}.wav`;

      ffmpeg(inputFile)
        .noVideo()
        .audioCodec('pcm_s16le') // WAV format
        .audioFrequency(16000) // Sample rate
        .audioChannels(1) // Mono
        .output(outputFilePath)
        .on('progress', (progress) => {
          if (progress.percent) {
            this.emit('progress', progress.percent);
          }
        })
        .on('end', () => {
          console.log(
            `[FFmpegAudioExtractor] Audio extraction complete: ${outputFilePath}`,
          );
          resolve(outputFilePath);
        })
        .on('error', (err) => {
          console.error(`[FFmpegAudioExtractor] Error extracting audio:`, err);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .run();
    });
  }
}
