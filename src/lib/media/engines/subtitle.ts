import * as fs from 'fs';
import * as path from 'path';

import { createClient, DeepgramClient } from '@deepgram/sdk';
import { TranslationServiceClient } from '@google-cloud/translate';
import ffmpeg from 'fluent-ffmpeg';

// Standardized output structure (aligning with plan, though process returns void for now)
import { SubtitleOutput } from '../engine-outputs'; // Import specific output type
import { EngineOutput, MediaEngine } from '../media-engine';

// Define potential options for the subtitle engine
interface SubtitleEngineOptions {
  deepgramModel?: string;
  sourceLanguage?: string; // Source language for transcription (e.g., 'en')
  targetLanguages?: string[]; // Target languages for translation (e.g., ['hi', 'pa'])
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
  sourceLanguage: 'en', // Default source language
  targetLanguages: [], // Default empty target languages
};

const TEMP_DIR = './tmp'; // Temporary directory for audio extraction

// Specify the output type for this engine
export class SubtitleEngine extends MediaEngine<SubtitleOutput> {
  private options: SubtitleEngineOptions;
  private deepgram: DeepgramClient;
  private translateClient: TranslationServiceClient | null = null;
  private googleProjectId: string | null = null;
  private projectIdPromise: Promise<string | null> | null = null; // Promise to track Project ID retrieval

  constructor(options: Partial<SubtitleEngineOptions> = {}) {
    super('SubtitleEngine');
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // --- Deepgram Setup ---
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      throw new Error(
        'Deepgram API key is missing. Please set the DEEPGRAM_API_KEY environment variable.',
      );
    }
    this.deepgram = createClient(deepgramApiKey);

    // --- Google Translate Setup ---
    // Only initialize if target languages are provided
    if (
      this.options.targetLanguages &&
      this.options.targetLanguages.length > 0
    ) {
      // Google Cloud SDK automatically uses GOOGLE_APPLICATION_CREDENTIALS env var
      // or other standard credential methods.
      try {
        this.translateClient = new TranslationServiceClient();
        // Wrap getProjectId in a promise to await later
        this.projectIdPromise = new Promise((resolve) => {
          this.translateClient!.getProjectId((err, projectId) => {
            if (err || !projectId) {
              console.error(
                `[${this.engineName}] Failed to get Google Project ID for translation:`,
                err || 'Project ID is null/undefined',
              );
              // Resolve with null to indicate failure, handle downstream
              this.googleProjectId = null;
              resolve(null);
            } else {
              this.googleProjectId = projectId;
              console.log(
                `[${this.engineName}] Google Translate client initialized for project: ${this.googleProjectId}`,
              );
              resolve(this.googleProjectId);
            }
          });
        });
        // Start the promise execution immediately, but don't block constructor
        this.projectIdPromise.catch((e) => {
          // Catch potential unexpected errors during promise creation/execution itself
          console.error(
            `[${this.engineName}] Unexpected error during Project ID promise setup:`,
            e,
          );
          this.googleProjectId = null; // Ensure it's null on error
        });
      } catch (error: any) {
        // Error during TranslationServiceClient instantiation
        console.error(
          `[${this.engineName}] Failed to initialize Google Translate client: ${error.message}`,
        );
        this.translateClient = null; // Ensure client is null
        this.projectIdPromise = Promise.resolve(null); // Set promise to resolved null
        // We don't throw here, let process() handle the lack of client/ID
        // throw new Error(
        //   `Failed to initialize Google Translate client: ${error.message}. Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly.`,
        // );
      }
    }

    this._ensureDirectoryExists(TEMP_DIR); // Ensure temp dir exists on init
  }

  async process(
    inputFile: string,
    outputDir: string,
    options?: any, // Keep options signature consistent with base class
  ): Promise<EngineOutput<SubtitleOutput>> {
    this.updateStatus('running');
    this._progress = 0;
    this._errorMessage = null;

    const baseName = path.parse(inputFile).name;
    const tempAudioPath = path.join(TEMP_DIR, `${baseName}_${Date.now()}.wav`); // Unique temp file name
    const sourceLang = this.options.sourceLanguage!; // Assume source language is set
    const targetLangs = this.options.targetLanguages || [];

    // Object to store VTT paths, keyed by language code
    const outputVttPaths: Record<string, string> = {};
    const translationErrors: Record<string, string> = {}; // Store errors per language

    try {
      this._ensureDirectoryExists(outputDir); // Ensure output dir exists

      // --- 1. Extract Audio ---
      console.log(
        `[${this.engineName}] Extracting audio from ${inputFile} to ${tempAudioPath}...`,
      );
      await this._extractAudio(inputFile, tempAudioPath);
      this.updateProgress({ percent: 15 }); // Adjusted progress

      // --- 2. Transcribe using Deepgram ---
      console.log(
        `[${this.engineName}] Sending audio to Deepgram for transcription (${sourceLang})...`,
      );
      const transcriptionResult = await this._transcribeAudio(tempAudioPath);
      this.updateProgress({ percent: 40 }); // Adjusted progress

      // --- 3. Generate Source Language VTT ---
      console.log(
        `[${this.engineName}] Generating VTT content for source language (${sourceLang})...`,
      );
      const sourceVttContent = this._generateVtt(transcriptionResult);
      const sourceVttPath = path.join(
        outputDir,
        `${baseName}.${sourceLang}.vtt`,
      );

      await fs.promises.writeFile(sourceVttPath, sourceVttContent);
      outputVttPaths[sourceLang] = sourceVttPath;
      console.log(
        `[${this.engineName}] Saved ${sourceLang} VTT file to ${sourceVttPath}`,
      );
      this.updateProgress({ percent: 50 }); // Progress after source VTT

      // --- 4. Translate and Generate Target Language VTTs ---
      const totalTargets = targetLangs.length;
      let targetsProcessed = 0;

      // --- 4a. Ensure Google Project ID is resolved before starting loop ---
      let googleTranslateReady = false;
      if (targetLangs.length > 0 && targetLangs.some((l) => l !== sourceLang)) {
        if (this.translateClient && this.projectIdPromise) {
          console.log(`[${this.engineName}] Waiting for Google Project ID...`);
          await this.projectIdPromise; // Wait for the promise to settle
          if (this.googleProjectId) {
            googleTranslateReady = true;
            console.log(
              `[${this.engineName}] Google Project ID resolved: ${this.googleProjectId}`,
            );
          } else {
            const errorMsg = 'Failed to resolve Google Project ID.';
            console.error(
              `[${this.engineName}] ${errorMsg} Translation skipped.`,
            );
            // Record error for all target languages needing translation
            targetLangs.forEach((lang) => {
              if (lang !== sourceLang) {
                translationErrors[lang] = errorMsg;
              }
            });
          }
        } else {
          const errorMsg = 'Google Translate client not initialized.';
          console.error(
            `[${this.engineName}] ${errorMsg} Translation skipped.`,
          );
          // Record error for all target languages needing translation
          targetLangs.forEach((lang) => {
            if (lang !== sourceLang) {
              translationErrors[lang] = errorMsg;
            }
          });
        }
      }

      // --- 4b. Translation Loop ---
      for (const targetLang of targetLangs) {
        if (targetLang === sourceLang) continue; // Skip translating to source language

        // Check if translation is possible before attempting
        if (!googleTranslateReady) {
          console.warn(
            `[${this.engineName}] Skipping translation to ${targetLang} due to initialization issues.`,
          );
          // Error already recorded above
          targetsProcessed++; // Still count as processed for progress calculation
          const translationProgress =
            50 + (targetsProcessed / totalTargets) * 45;
          this.updateProgress({ percent: translationProgress });
          continue; // Skip to next language
        }

        console.log(
          `[${this.engineName}] Translating VTT content to ${targetLang}...`,
        );
        // At this point, this.translateClient and this.googleProjectId are guaranteed to be valid if googleTranslateReady is true.

        try {
          // Use the refactored translation method
          const translatedVttContent = await this._translateVttContent(
            sourceVttContent,
            targetLang,
          );
          const targetVttPath = path.join(
            outputDir,
            `${baseName}.${targetLang}.vtt`,
          );
          await fs.promises.writeFile(targetVttPath, translatedVttContent);
          outputVttPaths[targetLang] = targetVttPath;
          console.log(
            `[${this.engineName}] Saved ${targetLang} VTT file to ${targetVttPath}`,
          );
        } catch (translateError: any) {
          const errorMsg = translateError.message || String(translateError);
          console.error(
            `[${this.engineName}] Failed to translate VTT to ${targetLang}: ${errorMsg}`,
          );
          translationErrors[targetLang] = errorMsg; // Store the specific error
          // Continue to the next language
        }

        targetsProcessed++;
        // Update progress based on translation completion (50% to 95% range)
        const translationProgress = 50 + (targetsProcessed / totalTargets) * 45;
        this.updateProgress({ percent: translationProgress });
      }

      // --- 5. Mark as complete and return success/partial success ---
      const hasTranslationErrors = Object.keys(translationErrors).length > 0;

      // Determine overall success. If there were fatal errors caught outside the loop,
      // success should be false. If only non-fatal translation errors occurred,
      // we might consider the overall operation "successful" but report the issues.
      this.complete(); // Mark engine as completed its run regardless of non-fatal errors

      if (hasTranslationErrors) {
        console.warn(
          `[${this.engineName}] Completed with some translation errors.`,
        );
        // Return success=true but include errors for informational purposes
        return {
          success: true, // Indicate the process finished, but check errors field
          output: {
            paths: { vtt: outputVttPaths }, // Include successfully generated paths
            data: {
              transcription: transcriptionResult, // Keep transcription data
              // Add translation errors if any occurred
              ...(hasTranslationErrors && {
                translations: {
                  errors: translationErrors, // Store the error object directly
                },
              }),
            },
          },
          // Optionally add a top-level error summary if needed, but detailed errors are in output.data
          // error: `Completed with translation errors: ${JSON.stringify(translationErrors)}`
        };
      } else {
        // Original success path - no translation errors occurred
        return {
          success: true,
          output: {
            paths: { vtt: outputVttPaths },
            data: transcriptionResult,
          },
        };
      }
    } catch (error: any) {
      // Outer catch block for fatal errors (audio extraction, transcription, file system, translate client init)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[${this.engineName}] Fatal error during processing:`,
        errorMessage,
      );
      this.fail(errorMessage); // Mark engine as failed
      // Combine fatal error with any previously recorded translation errors
      const combinedError =
        Object.keys(translationErrors).length > 0 ?
          `${errorMessage}. Non-fatal translation errors occurred before this: ${JSON.stringify(translationErrors)}`
          : errorMessage;
      return { success: false, error: combinedError }; // Return fatal error status
    } finally {
      // --- 6. Cleanup temporary audio file ---
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
    try {
      // Read from temp.json instead of transcribing
      const jsonData = await fs.promises.readFile('temp_transcoding.json', 'utf8');
      return JSON.parse(jsonData);

      const audioBuffer = await fs.promises.readFile(audioPath);
      const { result, error } =
        await this.deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
          model: this.options.deepgramModel,
          language: this.options.sourceLanguage,
          punctuate: true,
          utterances: true,
        });
      if (error) {
        console.error(`[${this.engineName}] Deepgram API error:`, error);
        throw new Error(`Deepgram transcription failed: ${error.message}`);
      }
      if (!result) {
        throw new Error('Deepgram transcription returned no result.');
      }
      console.log(`[${this.engineName}] Transcription received from Deepgram.`);

      // Todo: remove this
      // await fs.promises.writeFile(
      //   'temp_transcoding.json',
      //   JSON.stringify(result, null, 2),
      // );
      // console.log(
      //   `[${this.engineName}] Transcription result saved to temp.json`,
      // );

      return result;
    } catch (err: any) {
      console.error(`[${this.engineName}] Error reading temp.json:`, err);
      throw new Error(`Failed to read temp.json: ${err.message || err}`);
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

  // --- Method for VTT Translation (Single API Call) ---
  private async _translateVttContent(
    vttContent: string,
    targetLanguage: string,
  ): Promise<string> {
    if (!this.translateClient || !this.googleProjectId) {
      throw new Error('Translate client or Project ID not available.');
    }

    const sourceLanguage = this.options.sourceLanguage!;

    // --- Call Google Translate API with the entire VTT content ---
    try {
      console.log(
        `[${this.engineName}] Calling Google Translate API for VTT content (${sourceLanguage} -> ${targetLanguage})...`,
      );
      const request = {
        parent: `projects/${this.googleProjectId}/locations/global`,
        contents: [vttContent], // Send the entire VTT content
        mimeType: 'text/plain',
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
      };

      // const [response] = await this.translateClient.translateText(request);

      // Todo: remove this (optional, keep for debugging if needed)
      const response: any = JSON.parse(
        await fs.promises.readFile('temp_translations.json', 'utf-8'),
      );
      // await fs.promises.writeFile(
      //   'temp_translations.json',
      //   JSON.stringify(response, null, 2),
      // );
      // console.log(
      //   `[${this.engineName}] Translation response saved to temp_translations.json`,
      // );

      if (
        !response.translations ||
        response.translations.length === 0 ||
        !response.translations[0].translatedText
      ) {
        throw new Error('Google Translate API returned no valid translation.');
      }

      // --- Return the translated VTT content directly ---
      const translatedVttContent = response.translations[0].translatedText;
      console.log(
        `[${this.engineName}] Received translated VTT content for ${targetLanguage}.`,
      );
      return translatedVttContent;
    } catch (error: any) {
      console.error(
        `[${this.engineName}] Google Translate API error: ${error.message}`,
        error, // Log the full error object for more details
      );
      throw new Error(
        `Translation failed for ${targetLanguage}: ${error.message}`,
      );
    }
  }
}