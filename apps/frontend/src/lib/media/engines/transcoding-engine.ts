import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

import { AIEngineOutput, TranscodingOutput } from '../engine-outputs'; // Import AIEngineOutput
import {
  EngineOutput,
  MediaEngine,
  MediaEngineProgressDetail,
} from '../media-engine';

// Define interface for transcoding engine options to support dubbed audio
interface TranscodingEngineOptions {
  aiOutput?: AIEngineOutput; // Optional AI engine output containing dubbed audio paths
}

// Define potential options for the transcoding engine if needed in the future
// interface TranscodingEngineOptions { ... }

// Specify the output type for this engine
export class TranscodingEngine extends MediaEngine<TranscodingOutput> {
  constructor(/* options: Partial<TranscodingEngineOptions> = {} */) {
    super('TranscodingEngine');
    // Apply options if any
  }

  async process(
    inputFile: string,
    outputDir: string,
    options?: TranscodingEngineOptions, // Updated to use typed options
  ): Promise<EngineOutput<TranscodingOutput>> {
    this.updateStatus('running');
    this._progress = 0;
    this._errorMessage = null;

    const outputFileName = 'video'; // Default output name
    const outputManifest = path.join(outputDir, `${outputFileName}.mpd`);

    // Extract dubbed audio paths from AI engine output if available
    const dubbedAudioPaths = options?.aiOutput?.data?.dubbedAudioPaths || {};
    const hasDubbedAudio = Object.keys(dubbedAudioPaths).length > 0;

    if (hasDubbedAudio) {
      console.log(
        `[${this.engineName}] Found ${Object.keys(dubbedAudioPaths).length} dubbed audio tracks to include in manifest`,
      );
    }

    // Note: The 'async' keyword on 'process' is technically not needed when returning a new Promise directly,
    // but it doesn't hurt and keeps the signature consistent.
    return new Promise<EngineOutput<TranscodingOutput>>((resolve) => {
      // Resolve type is EngineOutput, reject is implicitly handled by resolving with {success: false}
      let totalDurationSeconds: number | null = null;

      const command = ffmpeg({
        source: inputFile,
        cwd: outputDir, // Run ffmpeg in the target directory
      });

      // Add dubbed audio tracks as additional inputs if available
      const dubbedAudioLanguages: string[] = [];
      if (hasDubbedAudio) {
        Object.entries(dubbedAudioPaths).forEach(([langCode, audioPath]) => {
          command.input(audioPath);
          dubbedAudioLanguages.push(langCode);
        });
      }

      // Calculate total number of adaptation sets needed
      // 1 for video + 1 for original audio + N for dubbed audio
      const totalAdaptationSets = 1 + 1 + dubbedAudioLanguages.length;

      // Generate simpler adaptation sets string with explicitly separated adaptation sets
      let adaptationSets = '';

      // Video adaptation set
      adaptationSets = 'id=0,streams=v';

      // Audio adaptation sets - explicitly list each one with their own ID
      // Original audio
      adaptationSets += ' id=1,streams=a:0';

      // Dubbed audio tracks
      if (hasDubbedAudio) {
        dubbedAudioLanguages.forEach((langCode, index) => {
          // Each dubbed audio track gets its own adaptation set
          adaptationSets += ` id=${index + 2},streams=a:${index + 1},lang=${langCode}`;
        });
      }

      console.log(
        `[${this.engineName}] Using adaptation sets: ${adaptationSets}`,
      );

      command
        // Video codec settings (using options from original _action.tsx)
        .videoCodec('libx264')
        .addOption('-preset', 'veryfast')
        .addOption('-profile:v', 'main')
        .addOption('-keyint_min', '60') // Keyframe interval settings
        .addOption('-g', '60')
        .addOption('-sc_threshold', '0')

        // Audio codec settings - only for original audio
        .audioCodec('aac')
        .audioBitrate('128k')

        // DASH specific settings
        .addOption('-use_timeline', '1')
        .addOption('-use_template', '1')
        .addOption('-seg_duration', '5') // Segment duration in seconds

        // Explicitly list the stream indexes as they appear in the output
        // The FFmpeg output streams will be:
        // 0-4: Video (different resolutions)
        // 5: Original audio
        // 6+: Dubbed audio
        // Use simple format without lang attribute - rely on -metadata for language info
        .addOption(
          '-adaptation_sets',
          `id=0,streams=0,1,2,3,4 id=1,streams=5 ${dubbedAudioLanguages
            .map((lang, i) => `id=${i + 2},streams=${i + 6}`)
            .join(' ')}`,
        )

        .addOption('-init_seg_name', 'init-stream$RepresentationID$.$ext$') // Naming for init segments
        .addOption(
          '-media_seg_name',
          'chunk-stream$RepresentationID$-$Number%05d$.$ext$', // Naming for media segments
        );

      // --- Multiple Video Representations ---
      // Map video stream multiple times for different quality levels
      command
        .addOption('-map', '0:v') // Map video stream (index 0)
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        .addOption('-map', '0:v')
        .addOption('-map', '0:v');

      // Add video metadata
      command.addOption('-metadata:s:v', 'content_type=video');

      // Map original audio stream
      command.addOption('-map', '0:a:0'); // Map audio stream explicitly with index
      command.addOption('-metadata:s:a:0', 'content_type=audio');
      command.addOption('-metadata:s:a:0', 'language=original');

      // Map dubbed audio streams if available
      if (hasDubbedAudio) {
        dubbedAudioLanguages.forEach((langCode, index) => {
          // Map each dubbed audio from its corresponding input file (1, 2, etc.)
          // First audio stream (a:0) from each input
          command.addOption('-map', `${index + 1}:a:0`);

          // Add language and content type metadata
          const outputStreamIndex = index + 1; // Index in output stream order
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
        .addOption('-bufsize:v:4', '9600k');

      // Audio codec settings for dubbed tracks
      if (hasDubbedAudio) {
        dubbedAudioLanguages.forEach((langCode, index) => {
          // Set codec and bitrate for each dubbed audio track
          // Index must match the output stream order (starting from 1 after the original audio)
          const outputStreamIndex = index + 1;
          command.addOption(`-c:a:${outputStreamIndex}`, 'aac');
          command.addOption(`-b:a:${outputStreamIndex}`, '128k');
        });
      }

      // Output format and file
      command
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
          console.log(`[${this.engineName}] stderr: ${stderrLine}`);
        })
        .on('error', (err, stdout, stderr) => {
          console.error(
            `[${this.engineName}] Transcoding error: ${err.message}`,
          );
          // console.error(`[${this.engineName}] ffmpeg stdout: ${stdout}`); // Optional: log stdout on error
          // console.error(`[${this.engineName}] ffmpeg stderr: ${stderr}`); // Optional: log stderr on error
          const errorMessage = `Transcoding failed: ${err.message}`;
          this.fail(errorMessage); // Set status and emit error event
          resolve({ success: false, error: errorMessage }); // Resolve with failure object
        })
        .on('end', (stdout, stderr) => {
          console.log(
            `[${this.engineName}] Transcoding finished successfully.`,
          );
          this.complete(); // Set status and emit complete event

          // Create output data matching TranscodingOutputData structure
          const dubbedLanguages = hasDubbedAudio ? dubbedAudioLanguages : [];

          // Resolve with success object, including the path to the manifest
          resolve({
            success: true,
            output: {
              data: {
                manifest: outputManifest,
                dubbedLanguages: dubbedLanguages,
                dubbedAudioTracks: dubbedLanguages,
              },
            },
          });
        });

      // Start the ffmpeg process
      console.log(`[${this.engineName}] Starting transcoding process...`);

      // Log the command to help with debugging
      command.on('start', (commandLine) => {
        console.log(`[${this.engineName}] FFmpeg command: ${commandLine}`);
      });

      command.run();
    });
  }
}
