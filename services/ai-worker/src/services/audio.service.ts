import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import { i } from 'genkit/lib/index-D0wVUZ6a';
import { inject, injectable } from 'tsyringe';

import type { AiSubtitleEntry } from '@ai-worker/models/types';
import type { SubtitleBlock } from '@ai-worker/utils/subtitle.utils';

import { TtsService, TtsServiceToken } from '@ai-worker/services/tts.service';
import { getAudioDuration } from '@ai-worker/utils/audio.utils';
import { groupSubtitles } from '@ai-worker/utils/subtitle.utils';

import { logger } from '../config/logger';
import { AppError, CommandExecutionError, logError } from '../domain/errors';

const execPromise = promisify(exec);

export const AudioServiceToken = Symbol('AudioService');

@injectable()
export class AudioService {
  private name = 'AudioService';

  constructor(@inject(TtsServiceToken) private ttsService: TtsService) {}

  private async runCommand(command: string, cwd?: string): Promise<void> {
    logger.info(
      `[${this.name}] Executing command: ${command} in ${cwd || process.cwd()}`,
    );
    try {
      const { stdout, stderr } = await execPromise(command, {
        cwd,
        shell: '/bin/sh',
      });
      if (stderr) logger.warn(`[${this.name}] Command stderr:\n${stderr}`);
      if (stdout) logger.info(`[${this.name}] Command stdout:\n${stdout}`);
    } catch (error: any) {
      const cmdError = new CommandExecutionError(command, error);
      logError(cmdError, `${this.name}:runCommand`);
      throw cmdError;
    }
  }

  extractAudio(inputFile: string, outputAudioFile: string): Promise<void> {
    logger.info(
      `[${this.name}] Extracting audio from ${inputFile} to ${outputAudioFile}`,
    );
    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .noVideo()
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputAudioFile)
        .on('error', (err) => {
          const error = new AppError(
            'AudioExtractionError',
            `Failed to extract audio from ${inputFile}: ${err.message}`,
            { originalError: err },
          );
          logError(error, `${this.name}:extractAudio`);
          reject(error);
        })
        .on('end', () => {
          logger.info(
            `[${this.name}] Audio extracted successfully to ${outputAudioFile}`,
          );
          resolve();
        })
        .run();
    });
  }

  async removeVocals(
    originalAudioPath: string,
    tempDir: string,
  ): Promise<string> {
    logger.info(`[${this.name}] Removing vocals from ${originalAudioPath}`);
    const binDir = path.resolve('bin');
    const instrumentalAudioPath = path.join(
      tempDir,
      `${path.parse(originalAudioPath).name}_Instruments.wav`,
    );
    const command = `./vocal_remover -P "models/baseline.pth" --output_dir "${path.resolve(tempDir)}" --input "${path.resolve(originalAudioPath)}"`;
    try {
      await this.runCommand(command, binDir);
      await fs.access(instrumentalAudioPath);
      logger.info(
        `[${this.name}] Vocals removed. Instrumental audio saved to ${instrumentalAudioPath}`,
      );
      return instrumentalAudioPath;
    } catch (error: any) {
      const appError = new AppError(
        'VocalRemovalError',
        `Failed to remove vocals from ${originalAudioPath}: ${error.message}`,
        { originalError: error },
      );
      logError(appError, `${this.name}:removeVocals`);
      throw appError;
    }
  }

  async generateDubbedAudio(
    instrumentalAudioPath: string,
    subtitles: AiSubtitleEntry[],
    langCode: string,
    tempDir: string,
    finalOutputPath: string,
    onProgress: (progress: number) => void,
  ): Promise<void> {
    logger.info(
      `[${this.name}] Generating dubbed audio for language ${langCode}`,
    );
    onProgress(0);

    const subtitleBlocks = groupSubtitles(subtitles, langCode);
    if (subtitleBlocks.length === 0) {
      logger.warn(
        `[${this.name}] No subtitle blocks to process for language ${langCode}.`,
      );
      return;
    }

    const processedSegments: string[] = [];
    let lastEndTime = 0;

    for (let i = 0; i < subtitleBlocks.length; i++) {
      const block = subtitleBlocks[i];
      const { segmentPath, ttsDuration } = await this.processSubtitleBlock(
        block,
        i,
        tempDir,
        lastEndTime,
      );
      processedSegments.push(segmentPath);
      lastEndTime = block.startTime + ttsDuration;
      onProgress(((i + 1) / subtitleBlocks.length) * 80);
    }

    const assembledTTSPath = path.join(tempDir, `assembled_${langCode}.mp3`);
    await this.concatenateAudioFiles(processedSegments, assembledTTSPath);
    logger.info(
      `[${this.name}] Assembled TTS track for ${langCode} to ${assembledTTSPath}`,
    );
    onProgress(90);

    await this.mergeAudio(
      instrumentalAudioPath,
      assembledTTSPath,
      finalOutputPath,
    );
    logger.info(
      `[${this.name}] Merged instrumental and TTS audio for ${langCode} to ${finalOutputPath}`,
    );
    onProgress(100);
  }

  private async processSubtitleBlock(
    block: SubtitleBlock,
    index: number,
    tempDir: string,
    lastEndTime: number,
  ): Promise<{ segmentPath: string; ttsDuration: number }> {
    const ttsLangCode = block.langCode === 'hi' ? 'hi-IN' : 'pa-IN';
    const ttsAudioPath = path.join(
      tempDir,
      `tts_${block.langCode}_${index}.mp3`,
    );

    await this.ttsService.generateTTSAudio(
      block.text,
      ttsLangCode,
      block.voiceGender,
      ttsAudioPath,
    );

    const ttsDuration = await getAudioDuration(ttsAudioPath);

    const silenceDuration = block.startTime - lastEndTime;
    const finalSegmentPath = path.join(
      tempDir,
      `segment_${block.langCode}_${index}.mp3`,
    );

    if (silenceDuration > 0) {
      const silencePath = path.join(
        tempDir,
        `silence_${block.langCode}_${index}.mp3`,
      );
      await this.createSilentAudio(silenceDuration, silencePath);
      await this.concatenateAudioFiles(
        [silencePath, ttsAudioPath],
        finalSegmentPath,
      );
    } else {
      await fs.rename(ttsAudioPath, finalSegmentPath);
    }

    return { segmentPath: finalSegmentPath, ttsDuration };
  }

  private createSilentAudio(
    duration: number,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=r=44100:cl=stereo')
        .inputFormat('lavfi')
        .duration(duration)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) =>
          reject(
            new AppError(
              'AudioCreationError',
              `Failed to create silent audio: ${err.message}`,
              { originalError: err },
            ),
          ),
        )
        .run();
    });
  }

  private concatenateAudioFiles(
    filePaths: string[],
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (filePaths.length === 0) {
        return resolve();
      }
      const command = ffmpeg();
      filePaths.forEach((p) => command.input(p));
      command
        .mergeToFile(outputPath, path.dirname(outputPath))
        .on('end', () => resolve())
        .on('error', (err) =>
          reject(
            new AppError(
              'AudioConcatenationError',
              `Failed to concatenate audio files: ${err.message}`,
              { originalError: err },
            ),
          ),
        );
    });
  }

  private mergeAudio(
    instrumentalPath: string,
    ttsPath: string,
    outputPath: string,
  ): Promise<void> {
    logger.debug(
      `[${this.name}] Merging instrumental audio (${instrumentalPath}) and TTS audio (${ttsPath}) to ${outputPath}`,
    );
    return new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(instrumentalPath)
        .input(ttsPath)
        .complexFilter([
          '[0:a]dynaudnorm=p=0.95:m=20[instr_norm]',
          '[instr_norm]volume=0.2:precision=fixed[instr_lowered]',
          '[1:a]dynaudnorm=p=0.95:m=20[tts_normalized]',
          '[tts_normalized]volume=2.0[tts_boosted]',
          '[instr_lowered][tts_boosted]amerge=inputs=2[aout]',
        ])
        .map('[aout]')
        .audioCodec('libmp3lame')
        .audioQuality(2)
        .output(outputPath)
        .on('error', (err) => {
          const error = new AppError(
            'AudioMergeError',
            `Failed to merge final audio to ${outputPath}: ${err.message}`,
            { originalError: err },
          );
          logError(error, `${this.name}:mergeAudio`);
          reject(error);
        })
        .on('end', () => {
          logger.debug(
            `[${this.name}] Final audio merged successfully to ${outputPath}`,
          );
          resolve();
        })
        .run();
    });
  }
}
