import { EventEmitter } from 'events';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { injectable } from 'tsyringe';

import { IMediaProcessor, MediaPrcessorEvent } from '@monorepo/core';
import { TranscodingOutput, WorkerOutput } from '@monorepo/workers';

import { logger } from '../config/logger';
import { MediaProcessorError } from '../entities/errors.entity';

interface TranscodingOptions {
  aiOutput?: { data?: { dubbedAudioPaths?: Record<string, string> } };
}

@injectable()
export class FfmpegTranscodingProcessor
  extends EventEmitter
  implements IMediaProcessor<TranscodingOutput, TranscodingOptions>
{
  private _progress = 0;

  async process(
    inputFile: string,
    outputDir: string,
    options?: TranscodingOptions,
  ): Promise<WorkerOutput<TranscodingOutput>> {
    this._progress = 0;

    return new Promise<WorkerOutput<TranscodingOutput>>((resolve, reject) => {
      const outputFileName = 'video';
      const outputManifest = path.join(outputDir, `${outputFileName}.mpd`);

      const dubbedAudioPaths = options?.aiOutput?.data?.dubbedAudioPaths || {};
      const hasDubbedAudio = Object.keys(dubbedAudioPaths).length > 0;

      if (hasDubbedAudio) {
        logger.info(
          `Found ${
            Object.keys(dubbedAudioPaths).length
          } dubbed audio tracks to include in manifest`,
        );
      }

      let totalDurationSeconds: number | null = null;

      const command = ffmpeg({
        source: inputFile,
        cwd: outputDir,
        logger,
      });

      const dubbedAudioLanguages: string[] = [];
      if (hasDubbedAudio) {
        Object.entries(dubbedAudioPaths).forEach(([langCode, audioPath]) => {
          command.input(audioPath);
          dubbedAudioLanguages.push(langCode);
        });
      }

      command
        .videoCodec('libx264')
        .addOption('-preset', 'veryfast')
        .addOption('-profile:v', 'main')
        .addOption('-keyint_min', '60')
        .addOption('-g', '60')
        .addOption('-sc_threshold', '0')
        .audioCodec('aac')
        .audioBitrate('128k')
        .addOption('-use_timeline', '1')
        .addOption('-use_template', '1')
        .addOption('-seg_duration', '5')
        .addOption(
          '-adaptation_sets',
          `id=0,streams=0,1,2,3,4 id=1,streams=5 ${dubbedAudioLanguages
            .map((lang, i) => `id=${i + 2},streams=${i + 6}`)
            .join(' ')}`,
        )
        .addOption('-init_seg_name', 'init-stream$RepresentationID$.$ext$')
        .addOption(
          '-media_seg_name',
          'chunk-stream$RepresentationID$-$Number%05d$.$ext$',
        );

      command
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        .addOption('-map', '0:v');

      command.addOption('-metadata:s:v', 'content_type=video');
      command.addOption('-map', '0:a:0');
      command.addOption('-metadata:s:a:0', 'content_type=audio');
      command.addOption('-metadata:s:a:0', 'language=original');

      if (hasDubbedAudio) {
        dubbedAudioLanguages.forEach((langCode, index) => {
          command.addOption('-map', `${index + 1}:a:0`);
          const outputStreamIndex = index + 1;
          command.addOption(
            `-metadata:s:a:${outputStreamIndex}`,
            `language=${langCode}`,
          );
          command.addOption(
            `-metadata:s:a:${outputStreamIndex}`,
            'content_type=audio',
          );
        });
      }

      command
        .addOption('-s:v:0', '426x240')
        .addOption('-b:v:0', '400k')
        .addOption('-maxrate:v:0', '480k')
        .addOption('-bufsize:v:0', '800k')
        .addOption('-s:v:1', '640x360')
        .addOption('-b:v:1', '800k')
        .addOption('-maxrate:v:1', '960k')
        .addOption('-bufsize:v:1', '1600k')
        .addOption('-s:v:2', '854x480')
        .addOption('-b:v:2', '1200k')
        .addOption('-maxrate:v:2', '1440k')
        .addOption('-bufsize:v:2', '2400k')
        .addOption('-s:v:3', '1280x720')
        .addOption('-b:v:3', '2400k')
        .addOption('-maxrate:v:3', '2880k')
        .addOption('-bufsize:v:3', '4800k')
        .addOption('-s:v:4', '1920x1080')
        .addOption('-b:v:4', '4800k')
        .addOption('-maxrate:v:4', '5760k')
        .addOption('-bufsize:v:4', '9600k');

      if (hasDubbedAudio) {
        dubbedAudioLanguages.forEach((_, index) => {
          const outputStreamIndex = index + 1;
          command.addOption(`-c:a:${outputStreamIndex}`, 'aac');
          command.addOption(`-b:a:${outputStreamIndex}`, '128k');
        });
      }

      command.format('dash').output(outputManifest);

      command
        .on('codecData', (data) => {
          try {
            const durationParts = data.duration.split(':');
            totalDurationSeconds =
              parseInt(durationParts[0]) * 3600 +
              parseInt(durationParts[1]) * 60 +
              parseFloat(durationParts[2]);
            logger.info(`Determined duration: ${totalDurationSeconds}s`);
          } catch (e) {
            logger.warn(
              `Could not parse duration from codecData: ${data.duration}`,
            );
            totalDurationSeconds = null;
          }
        })
        .on('progress', (info) => {
          let percent = 0;
          if (totalDurationSeconds && info.timemark) {
            try {
              const timemarkParts = info.timemark.split(':');
              const currentSeconds =
                parseInt(timemarkParts[0]) * 3600 +
                parseInt(timemarkParts[1]) * 60 +
                parseFloat(timemarkParts[2]);
              percent = (currentSeconds / totalDurationSeconds) * 100;
            } catch (e) {
              percent = info.percent || this._progress;
            }
          } else {
            percent = info.percent || this._progress;
          }
          this._progress = Math.min(100, Math.max(0, percent));
          this.emit(MediaPrcessorEvent.Progress, this._progress);
        })
        .on('stderr', (stderrLine) => {
          logger.debug(`ffmpeg stderr: ${stderrLine}`);
        })
        .on('error', (err, stdout, stderr) => {
          const errorMessage = `Transcoding failed: ${err.message}`;
          logger.error(errorMessage, {
            stdout,
            stderr,
          });
          reject(new MediaProcessorError(errorMessage));
        })
        .on('end', () => {
          logger.info('Transcoding finished successfully.');
          const dubbedLanguages = hasDubbedAudio ? dubbedAudioLanguages : [];
          resolve({
            success: true,
            output: {
              manifest: outputManifest,
              dubbedLanguages: dubbedLanguages,
              dubbedAudioTracks: dubbedLanguages,
            },
          });
        });

      command.on('start', (commandLine) => {
        logger.info(`Executing FFmpeg command: ${commandLine}`);
      });

      command.run();
    });
  }
}
