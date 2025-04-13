import * as path from 'path';

import ffmpeg from 'fluent-ffmpeg';

import { MediaEngine, MediaEngineProgressDetail } from '../media-engine';

// Define potential options for the transcoding engine if needed in the future
// interface TranscodingEngineOptions { ... }

export class TranscodingEngine extends MediaEngine {
  constructor(/* options: Partial<TranscodingEngineOptions> = {} */) {
    super('TranscodingEngine');
    // Apply options if any
  }

  async process(
    inputFile: string,
    outputDir: string,
    options?: any, // Options could include target formats, bitrates etc.
  ): Promise<void> {
    this.updateStatus('running');
    this._progress = 0;
    this._errorMessage = null;

    const outputFileName = options?.outputFileName || 'video'; // Default output name
    const outputManifest = path.join(outputDir, `${outputFileName}.mpd`);

    return new Promise((resolve, reject) => {
      let totalDurationSeconds: number | null = null;

      const command = ffmpeg({
        source: inputFile,
        cwd: outputDir, // Run ffmpeg in the target directory
      });

      command
        // Video codec settings (using options from original _action.tsx)
        .videoCodec('libx264')
        .addOption('-preset', 'veryfast')
        .addOption('-profile:v', 'main')
        .addOption('-keyint_min', '60') // Keyframe interval settings
        .addOption('-g', '60')
        .addOption('-sc_threshold', '0')

        // Audio codec settings
        .audioCodec('aac')
        .audioBitrate('128k')

        // DASH specific settings
        .addOption('-use_timeline', '1')
        .addOption('-use_template', '1')
        .addOption('-seg_duration', '5') // Segment duration in seconds
        .addOption('-adaptation_sets', 'id=0,streams=v id=1,streams=a') // Map video and audio streams
        .addOption('-init_seg_name', 'init-stream$RepresentationID$.$ext$') // Naming for init segments
        .addOption(
          '-media_seg_name',
          'chunk-stream$RepresentationID$-$Number%05d$.$ext$', // Naming for media segments
        )

        // --- Multiple Video Representations ---
        // Map video stream multiple times for different quality levels
        .addOption('-map', '0:v') // Map video stream (index 0)
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        // Map audio stream once
        .addOption('-map', '0:a') // Map audio stream (index 0)

        // Representation 0: 240p
        .addOption('-s:v:0', '426x240')
        .addOption('-b:v:0', '400k')
        .addOption('-maxrate:v:0', '480k')
        .addOption('-bufsize:v:0', '800k')

        // Representation 1: 360p
        .addOption('-s:v:1', '640x360')
        .addOption('-b:v:1', '800k')
        .addOption('-maxrate:v:1', '960k')
        .addOption('-bufsize:v:1', '1600k')

        // Representation 2: 480p
        .addOption('-s:v:2', '854x480')
        .addOption('-b:v:2', '1200k')
        .addOption('-maxrate:v:2', '1440k')
        .addOption('-bufsize:v:2', '2400k')

        // Representation 3: 720p
        .addOption('-s:v:3', '1280x720')
        .addOption('-b:v:3', '2400k')
        .addOption('-maxrate:v:3', '2880k')
        .addOption('-bufsize:v:3', '4800k')

        // Representation 4: 1080p
        .addOption('-s:v:4', '1920x1080')
        .addOption('-b:v:4', '4800k')
        .addOption('-maxrate:v:4', '5760k')
        .addOption('-bufsize:v:4', '9600k')

        // Output format and file
        .format('dash') // Output format DASH
        .output(outputManifest); // Output manifest file

      command
        .on('codecData', (data) => {
          // Attempt to get duration from codecData
          try {
            // Example duration format: "00:00:30.123"
            const durationParts = data.duration.split(':');
            totalDurationSeconds =
              parseInt(durationParts[0]) * 3600 +
              parseInt(durationParts[1]) * 60 +
              parseFloat(durationParts[2]);
            console.log(
              `[${this.engineName}] Determined duration: ${totalDurationSeconds}s`,
            );
          } catch (e) {
            console.warn(
              `[${this.engineName}] Could not parse duration from codecData:`,
              data.duration,
            );
            totalDurationSeconds = null; // Fallback if parsing fails
          }
        })
        .on('progress', (info) => {
          let percent = 0;
          // info.percent is often unreliable with complex outputs/DASH
          // Calculate manually if possible
          if (totalDurationSeconds && info.timemark) {
            try {
              const timemarkParts = info.timemark.split(':');
              const currentSeconds =
                parseInt(timemarkParts[0]) * 3600 +
                parseInt(timemarkParts[1]) * 60 +
                parseFloat(timemarkParts[2]);
              percent = (currentSeconds / totalDurationSeconds) * 100;
            } catch (e) {
              // Fallback if timemark parsing fails
              percent = info.percent || this._progress; // Use last known good progress
            }
          } else {
            percent = info.percent || this._progress; // Use ffmpeg's percent or last known if duration unknown
          }

          const progressDetail: MediaEngineProgressDetail = {
            percent: Math.min(100, Math.max(0, percent)), // Clamp between 0-100
          };
          this.updateProgress(progressDetail);
        })
        .on('stderr', (stderrLine) => {
          // Log stderr for debugging if needed, but can be very verbose
          // console.log(`[${this.engineName}] stderr: ${stderrLine}`);
        })
        .on('error', (err, stdout, stderr) => {
          console.error(
            `[${this.engineName}] Transcoding error: ${err.message}`,
          );
          // console.error(`[${this.engineName}] ffmpeg stdout: ${stdout}`); // Optional: log stdout on error
          // console.error(`[${this.engineName}] ffmpeg stderr: ${stderr}`); // Optional: log stderr on error
          this.fail(new Error(`Transcoding failed: ${err.message}`));
          reject(err); // Reject the promise
        })
        .on('end', (stdout, stderr) => {
          console.log(
            `[${this.engineName}] Transcoding finished successfully.`,
          );
          this.complete(); // Sets progress to 100, status to 'completed'
          resolve(); // Resolve the promise
        });

      // Start the ffmpeg process
      console.log(`[${this.engineName}] Starting transcoding process...`);
      command.run();
    });
  }
}
