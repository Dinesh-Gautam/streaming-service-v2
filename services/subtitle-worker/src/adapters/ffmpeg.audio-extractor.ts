import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { injectable } from 'tsyringe';

import { IAudioExtractor } from '@monorepo/core';

@injectable()
export class FFmpegAudioExtractor
  extends EventEmitter
  implements IAudioExtractor
{
  public async extractAudio(
    inputFile: string,
    outputDir: string,
  ): Promise<string> {
    const hasAudio = await this._hasAudioStream(inputFile);
    if (!hasAudio) {
      console.log(
        `[FFmpegAudioExtractor] No audio stream found in ${inputFile}. Skipping extraction.`,
      );

      //todo : replace with custom error class
      throw new Error('No audio stream found in input file.');
    }

    return new Promise((resolve, reject) => {
      const outputFilename = `${randomUUID()}.wav`;
      const outputFilePath = path.join(outputDir, outputFilename);

      console.log(
        `[FFmpegAudioExtractor] Preparing to extract audio. Input: ${inputFile}, Output: ${outputFilePath}`,
      );

      this._ensureDirectoryExists(outputDir);

      ffmpeg(inputFile)
        .noVideo()
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .outputOptions('-f', 'wav')
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
        .on('error', (err, stdout, stderr) => {
          console.error(`[FFmpegAudioExtractor] Error extracting audio:`, err);
          console.error(`[FFmpegAudioExtractor] ffmpeg stdout:`, stdout);
          console.error(`[FFmpegAudioExtractor] ffmpeg stderr:`, stderr);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  private _ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private _hasAudioStream(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error(`[FFmpegAudioExtractor] ffprobe error:`, err.message);
          resolve(false);
          return;
        }
        const hasAudio = metadata.streams.some((s) => s.codec_type === 'audio');
        resolve(hasAudio);
      });
    });
  }
}
