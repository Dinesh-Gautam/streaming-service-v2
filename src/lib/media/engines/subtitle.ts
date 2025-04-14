import * as fs from 'fs';
import { Buffer } from 'node:buffer'; // For Deepgram SDK
import * as path from 'path';

import { createClient, DeepgramClient } from '@deepgram/sdk';
import ffmpeg from 'fluent-ffmpeg';

// Standardized output structure (aligning with plan, though process returns void for now)
import {
  EngineOutput,
  MediaEngine,
  MediaEngineProgressDetail,
  MediaEngineStatus,
} from '../media-engine';

// Define potential options for the subtitle engine
interface SubtitleEngineOptions {
  deepgramModel?: string;
  language?: string;
  // Add other potential options like custom VTT styling later
}

// Import the interface

// Standardized output structure
// interface EngineOutput { // Definition moved to media-engine.ts
//   success: boolean;
//   outputPaths?: { [key: string]: string }; // e.g., { vtt: '/path/to/video.vtt' }
//   data?: any; // e.g., Raw transcription
//   error?: string | Error;
// }

const DEFAULT_OPTIONS: SubtitleEngineOptions = {
  deepgramModel: 'nova-2', // Default model
  language: 'en', // Default language
};

const TEMP_DIR = './tmp'; // Temporary directory for audio extraction

export class SubtitleEngine extends MediaEngine {
  private options: SubtitleEngineOptions;
  private deepgram: DeepgramClient;

  constructor(options: Partial<SubtitleEngineOptions> = {}) {
    super('SubtitleEngine');
    this.options = { ...DEFAULT_OPTIONS, ...options };

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      // Throw an error during instantiation if the key is missing
      // This prevents the engine from even starting without credentials
      throw new Error(
        'Deepgram API key is missing. Please set the DEEPGRAM_API_KEY environment variable.',
      );
    }
    this.deepgram = createClient(apiKey);
    this._ensureDirectoryExists(TEMP_DIR); // Ensure temp dir exists on init
  }

  async process(
    inputFile: string,
    outputDir: string,
    options?: any, // Keep options signature consistent with base class
  ): Promise<EngineOutput> {
    this.updateStatus('running');
    this._progress = 0;
    this._errorMessage = null;

    const baseName = path.parse(inputFile).name;
    const tempAudioPath = path.join(TEMP_DIR, `${baseName}_${Date.now()}.wav`); // Unique temp file name
    const outputVttPath = path.join(outputDir, `${baseName}.vtt`);

    try {
      this._ensureDirectoryExists(outputDir); // Ensure output dir exists

      // 1. Extract Audio using ffmpeg
      console.log(
        `[${this.engineName}] Extracting audio from ${inputFile} to ${tempAudioPath}...`,
      );
      await this._extractAudio(inputFile, tempAudioPath);
      this.updateProgress({ percent: 25 }); // Rough progress update

      // 2. Transcribe using Deepgram
      console.log(
        `[${this.engineName}] Sending audio to Deepgram for transcription...`,
      );
      const transcriptionResult = await this._transcribeAudio(tempAudioPath);
      this.updateProgress({ percent: 75 }); // Rough progress update

      // 3. Generate VTT content
      console.log(`[${this.engineName}] Generating VTT content...`);
      const vttContent = this._generateVtt(transcriptionResult);

      // 4. Save VTT file
      console.log(
        `[${this.engineName}] Saving VTT file to ${outputVttPath}...`,
      );
      await fs.promises.writeFile(outputVttPath, vttContent);
      // 5. Mark as complete and return success
      this.complete(); // Sets progress to 100 and status to 'completed' via event
      // Return success object
      return {
        success: true,
        outputPaths: { vtt: outputVttPath },
        data: transcriptionResult, // Optionally pass raw data
      };
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[${this.engineName}] Error during processing:`,
        errorMessage,
      );
      this.fail(errorMessage); // Sets status to 'failed' and stores error message via event
      // Return failure object
      return { success: false, error: errorMessage };
    } finally {
      // 6. Cleanup temporary audio file
      await this._cleanupTempFile(tempAudioPath);
    }
  }

  private _ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      console.log(`[${this.engineName}] Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private _extractAudio(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('pcm_s16le') // WAV format
        .audioFrequency(16000) // Sample rate
        .audioChannels(1) // Mono
        .output(outputPath)
        .on('end', () => {
          console.log(`[${this.engineName}] Audio extraction complete.`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${this.engineName}] Error extracting audio:`, err);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        // Add progress handling if needed, though audio extraction is usually fast
        .run();
    });
  }

  private async _transcribeAudio(audioPath: string): Promise<any> {
    // Define a more specific type later
    try {
      const audioBuffer = await fs.promises.readFile(audioPath);
      const { result, error } =
        await this.deepgram.listen.prerecorded.transcribeFile(
          audioBuffer, // Use Buffer
          {
            model: this.options.deepgramModel,
            language: this.options.language,
            punctuate: true,
            utterances: true, // Crucial for timing info
          },
        );

      if (error) {
        console.error(`[${this.engineName}] Deepgram API error:`, error);
        throw new Error(`Deepgram transcription failed: ${error.message}`);
      }
      if (!result) {
        throw new Error('Deepgram transcription returned no result.');
      }

      console.log(`[${this.engineName}] Transcription received from Deepgram.`);
      return result; // Contains result.results.utterances
    } catch (err: any) {
      // Catch potential file read errors or SDK errors
      console.error(
        `[${this.engineName}] Error during transcription request:`,
        err,
      );
      throw new Error(`Transcription request failed: ${err.message || err}`);
    }
  }

  private _generateVtt(transcriptionResult: any): string {
    if (!transcriptionResult?.results?.utterances) {
      console.warn(
        `[${this.engineName}] No utterances found in transcription result.`,
      );
      return 'WEBVTT\n\n'; // Return empty VTT
    }

    let vttContent = 'WEBVTT\n\n';
    const utterances = transcriptionResult.results.utterances;

    for (const utterance of utterances) {
      if (utterance.transcript.trim() === '') continue; // Skip empty utterances

      const startTime = this._formatVttTime(utterance.start);
      const endTime = this._formatVttTime(utterance.end);

      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${utterance.transcript.trim()}\n\n`;
    }

    return vttContent;
  }

  // Reusing the VTT time formatting logic from ThumbnailEngine
  private _formatVttTime(seconds: number): string {
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${secs}.${ms}`;
  }

  private async _cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(
          `[${this.engineName}] Cleaned up temporary file: ${filePath}`,
        );
      }
    } catch (error) {
      console.warn(
        `[${this.engineName}] Failed to clean up temporary file ${filePath}:`,
        error,
      );
      // Don't throw an error here, just warn
    }
  }
}
