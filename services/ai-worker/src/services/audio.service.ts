import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import { injectable } from 'tsyringe';

import { logger } from '../config/logger';
import { AppError, CommandExecutionError, logError } from '../domain/errors';
import { AiSubtitleEntry } from '../models/types';
import { timecodeToSeconds } from '../utils/vtt.utils';
import { TtsService } from './tts.service';

const execPromise = promisify(exec);

@injectable()
export class AudioService {
  private name = 'AudioService';

  constructor(private ttsService: TtsService) {}

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
    const ttsLangCode = langCode === 'hi' ? 'hi-IN' : 'pa-IN';
    const segmentFiles: string[] = [];
    onProgress(0);

    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      if (sub.text.trim()) {
        const segmentPath = path.join(tempDir, `tts_${langCode}_${i}.mp3`);
        try {
          await this.ttsService.generateTTSAudio(
            sub.text,
            ttsLangCode,
            sub.voiceGender,
            segmentPath,
          );
          segmentFiles.push(segmentPath);
        } catch (error: any) {
          const appError = new AppError(
            'TtsGenerationError',
            `Failed to generate TTS audio for subtitle segment ${i} (${langCode}): ${error.message}`,
            { originalError: error },
          );
          logError(appError, `${this.name}:generateDubbedAudio`);
        }
      }
      onProgress(((i + 1) / subtitles.length) * 50);
    }

    if (segmentFiles.length === 0) {
      logger.warn(
        `[${this.name}] No TTS audio segments generated for language ${langCode}. Skipping dubbing.`,
      );
      return;
    }

    const assembledTTSPath = path.join(tempDir, `assembled_${langCode}.mp3`);
    try {
      await this.assembleTtsTrack(segmentFiles, subtitles, assembledTTSPath);
      logger.info(
        `[${this.name}] Assembled TTS track for ${langCode} to ${assembledTTSPath}`,
      );
      onProgress(80);
    } catch (error: any) {
      const appError = new AppError(
        'TtsAssemblyError',
        `Failed to assemble TTS track for ${langCode}: ${error.message}`,
        { originalError: error },
      );
      logError(appError, `${this.name}:generateDubbedAudio`);
      throw appError;
    }

    try {
      await this.mergeAudio(
        instrumentalAudioPath,
        assembledTTSPath,
        finalOutputPath,
      );
      logger.info(
        `[${this.name}] Merged instrumental and TTS audio for ${langCode} to ${finalOutputPath}`,
      );
      onProgress(100);
    } catch (error: any) {
      const appError = new AppError(
        'AudioMergeError',
        `Failed to merge audio for ${langCode}: ${error.message}`,
        { originalError: error },
      );
      logError(appError, `${this.name}:generateDubbedAudio`);
      throw appError;
    }
  }

  private assembleTtsTrack(
    segmentFiles: string[],
    subtitles: AiSubtitleEntry[],
    outputPath: string,
  ): Promise<void> {
    logger.debug(
      `[${this.name}] Assembling TTS track from ${segmentFiles.length} segments to ${outputPath}`,
    );
    return new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      const filterComplex: string[] = [];
      let outputStreams = '';
      segmentFiles.forEach((segmentPath, index) => {
        command.input(segmentPath);
        const startTimeMs = Math.round(
          timecodeToSeconds(subtitles[index].startTimecode) * 1000,
        );
        filterComplex.push(
          `[${index}:a]adelay=${startTimeMs}|${startTimeMs}[aud${index}]`,
        );
        outputStreams += `[aud${index}]`;
      });
      filterComplex.push(
        `${outputStreams}amix=inputs=${segmentFiles.length}:normalize=1:dropout_transition=0[mixed]`,
        `[mixed]dynaudnorm=p=0.95:m=20[mixout]`,
      );
      command
        .complexFilter(filterComplex)
        .map('[mixout]')
        .audioCodec('libmp3lame')
        .audioQuality(2)
        .output(outputPath)
        .on('error', (err) => {
          const error = new AppError(
            'TtsAssemblyError',
            `Failed to assemble TTS track to ${outputPath}: ${err.message}`,
            { originalError: err },
          );
          logError(error, `${this.name}:assembleTtsTrack`);
          reject(error);
        })
        .on('end', () => {
          logger.debug(
            `[${this.name}] TTS track assembled successfully to ${outputPath}`,
          );
          resolve();
        })
        .run();
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
