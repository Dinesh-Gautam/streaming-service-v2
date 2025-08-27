import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import ffmpeg from 'fluent-ffmpeg';
// Genkit Core and Google AI Plugin
// Assume genkit is configured globally, e.g., in genkit.config.ts

// Import base class and types
import { z } from 'zod'; // Using Zod for parsing the structured output

import {
  AiVideoAnalysisResponseSchema,
  GenerateMovieImagesFlow,
  VideoAnalysisFlow,
} from '@/lib/ai/flow';

import { AIEngineOutput } from '../engine-outputs'; // Will need update later
import {
  EngineOutput,
  MediaEngine,
  MediaEngineProgressDetail,
} from '../media-engine';

// Define the structure for a single subtitle entry from the AI response
// Based on src/lib/ai/flow.ts AiVideoAnalysisResponseSchema.subtities
type AiSubtitleEntry = {
  startTimecode: string; // Changed from startTime: number
  endTimecode: string; // Changed from endTime: number
  text: string;
  voiceGender: 'male' | 'female';
  voiceType: 'neutral' | 'angry' | 'happy';
};

// Define the structure for the chapters array from the AI response
type AiChaptersData = {
  timecode: string; // Changed from startTime: number
  chapterTitle: string;
}[];

type AiVideoAnalysisResponseType = z.infer<
  typeof AiVideoAnalysisResponseSchema
>;

const execPromise = promisify(exec); // Promisify exec for async/await usage

// Specify the output type for this engine
export class AIEngine extends MediaEngine<AIEngineOutput> {
  private ttsClient: TextToSpeechClient;

  constructor() {
    super('AIEngine');
    // Initialize TTS Client - ensure GOOGLE_APPLICATION_CREDENTIALS is set
    try {
      this.ttsClient = new TextToSpeechClient();
      console.log(`[${this.engineName}] Google TTS Client Initialized.`);
    } catch (error: any) {
      console.error(
        `[${this.engineName}] Failed to initialize Google TTS Client: ${error.message}`,
      );
      // Decide how to handle this - maybe throw or set a flag
      // For now, we'll let it potentially fail later in process()
      this.ttsClient = null as any; // Assign null if initialization fails
    }
  }

  async process(
    inputFile: string,
    outputDir: string,
  ): Promise<EngineOutput<AIEngineOutput>> {
    this.updateStatus('running');
    this._progress = 0;
    this._errorMessage = null;

    console.log(
      `[${this.engineName}] Starting AI processing for: ${inputFile}`,
    );

    // --- Check API Key & Initialize Genkit Instance ---
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      const errorMsg = 'GOOGLE_API_KEY environment variable not set.';
      console.error(`[${this.engineName}] ${errorMsg}`);
      this.fail(errorMsg);
      return { success: false, error: errorMsg };
    }
    if (!this.ttsClient) {
      const errorMsg = 'Google TTS Client failed to initialize.';
      console.error(`[${this.engineName}] ${errorMsg}`);
      this.fail(errorMsg);
      return { success: false, error: errorMsg };
    }

    // Extract movieId from outputDir (assuming outputDir path ends with the ID)
    const movieId = path.basename(outputDir);
    const baseName = path.parse(inputFile).name; // Get base filename without extension
    if (!movieId) {
      const errorMsg = `Could not determine movieId from outputDir: ${outputDir}`;
      console.error(`[${this.engineName}] ${errorMsg}`);
      this.fail(errorMsg);
      return { success: false, error: errorMsg };
    }
    console.log(`[${this.engineName}] Using movieId: ${movieId}`);

    // Create a temporary directory for intermediate audio files
    const tempAudioDir = await fs.promises.mkdir(path.join('temp/'), {
      recursive: true,
    });
    console.log(`[${this.engineName}] Created temp directory: ${tempAudioDir}`);

    if (!tempAudioDir) {
      throw new Error(
        `[${this.engineName}] Failed to create temp directory: ${tempAudioDir}`,
      );
    }

    try {
      // --- Call Genkit Generate for Video Analysis ---
      console.log(
        `[${this.engineName}] Sending video analysis request to Gemini...`,
      );
      this.updateProgress({ percent: 15 });

      const analysisResult = await VideoAnalysisFlow({
        videoFilePath: inputFile,
      });

      this.updateProgress({ percent: 40 });

      // --- Parse AI Response ---
      // Use the inferred type for better type safety
      const aiData = analysisResult as AiVideoAnalysisResponseType;
      console.log(
        `[${this.engineName}] Received and parsed AI video analysis response.`,
      );

      // --- Construct and Save Chapters VTT (if generated) ---
      let chaptersVttContent: string | undefined = undefined;
      let chaptersVttPath: string | undefined = undefined;
      if (aiData.chaptersVtt && aiData.chaptersVtt.length > 0) {
        chaptersVttContent = this._constructChaptersVtt(aiData.chaptersVtt);
        chaptersVttPath = path.join(outputDir, `${baseName}.chapters.vtt`);
        try {
          await fs.promises.writeFile(chaptersVttPath, chaptersVttContent);
          console.log(
            `[${this.engineName}] Chapters VTT saved to: ${chaptersVttPath}`,
          );
        } catch (writeError: any) {
          console.warn(
            `[${this.engineName}] Failed to save chapters VTT file: ${writeError.message}`,
          );
          chaptersVttPath = undefined; // Reset path if saving failed
          chaptersVttContent = undefined;
        }
      } else {
        console.log(`[${this.engineName}] No chapter VTT generated by AI.`);
      }
      this.updateProgress({ percent: 45 });

      // --- Construct and Save Subtitles VTT (if generated) ---
      const subtitlePaths: Record<string, string> = {}; // Store paths like { 'hi': 'path/to/hi.vtt' }
      const subtitleSaveErrors: Record<string, string> = {};

      // IMPORTANT: Accessing using the typo 'subtities' from the schema
      if (aiData.subtities && Object.keys(aiData.subtities).length > 0) {
        console.log(`[${this.engineName}] Processing generated subtitles...`);
        const languages = Object.keys(aiData.subtities);
        const totalLangs = languages.length;
        let langsProcessed = 0;

        for (const langCode of languages) {
          // Cast langCode to the correct key type
          const subtitles =
            aiData.subtities[langCode as keyof typeof aiData.subtities];
          if (subtitles && subtitles.length > 0) {
            const vttContent = this._constructSubtitlesVtt(subtitles);
            const vttPath = path.join(
              outputDir,
              `${baseName}.${langCode}.ai.vtt`,
            );
            try {
              await fs.promises.writeFile(vttPath, vttContent);
              subtitlePaths[langCode] = vttPath;
              console.log(
                `[${this.engineName}] Subtitles VTT for '${langCode}' saved to: ${vttPath}`,
              );
            } catch (writeError: any) {
              const errorMsg = `Failed to save subtitles VTT for '${langCode}': ${writeError.message}`;
              console.warn(`[${this.engineName}] ${errorMsg}`);
              subtitleSaveErrors[langCode] = errorMsg;
            }
          } else {
            console.log(
              `[${this.engineName}] No subtitle entries found for language '${langCode}'.`,
            );
          }
          langsProcessed++;
          // Update progress within the subtitle loop (45% to 60% range)
          const subtitleProgress = 45 + (langsProcessed / totalLangs) * 15;
          this.updateProgress({ percent: subtitleProgress });
        }
      } else {
        console.log(`[${this.engineName}] No subtitles generated by AI.`);
        this.updateProgress({ percent: 60 }); // Skip subtitle progress if none
      }

      // === Step 2: Generate Images (if text analysis succeeded) ===
      let posterImagePath: string | undefined = undefined;
      let backdropImagePath: string | undefined = undefined;

      if (aiData.title && aiData.description && aiData.genres) {
        console.log(`[${this.engineName}] Starting AI image generation...`);
        this.updateProgress({ percent: 65 });
        try {
          const imageResult = await GenerateMovieImagesFlow({
            movieId: movieId,
            title: aiData.title,
            description: aiData.description,
            genres: aiData.genres,
            imageGenerationPrompt: aiData.imageGenerationPrompt,
          });
          posterImagePath = imageResult.posterImagePath;
          backdropImagePath = imageResult.backdropImagePath;
          console.log(`[${this.engineName}] AI image generation completed.`);
          this.updateProgress({ percent: 90 });
        } catch (imageError: any) {
          console.warn(
            `[${this.engineName}] AI image generation failed: ${imageError.message}`,
            imageError,
          );
          this.updateProgress({ percent: 90 }); // Still update progress even if images fail
        }
      } else {
        console.warn(
          `[${this.engineName}] Skipping image generation due to missing title, description, or genres from text analysis.`,
        );
        this.updateProgress({ percent: 90 }); // Skip image gen progress
      }
      this.updateProgress({ percent: 90 }); // Progress after image gen attempt

      // === Step 3: Audio Dubbing ===
      let dubbedAudioPaths: Record<string, string> = {};
      let audioProcessingErrors: Record<string, string> = {};
      const originalAudioPath = path.join(
        tempAudioDir,
        `${baseName}_original.wav`,
      );
      const instrumentalAudioPath = path.join(
        tempAudioDir,
        `${baseName}_original_Instruments.wav`, // Vocal remover output name convention
      );
      const vocalAudioPath = path.join(
        tempAudioDir,
        `${baseName}_original_Vocals.wav`, // Vocal remover output name convention
      );

      try {
        // 3.1 Extract Original Audio (as WAV for vocal remover)
        console.log(`[${this.engineName}] Extracting original audio...`);
        await this._extractAudio(inputFile, originalAudioPath);
        console.log(
          `[${this.engineName}] Original audio extracted to: ${originalAudioPath}`,
        );
        this.updateProgress({ percent: 91 });

        // 3.2 Remove Vocals
        console.log(`[${this.engineName}] Removing vocals...`);
        const binDir = path.resolve('bin'); // Absolute path to bin directory
        const vocalRemoverExe = 'vocal_remover.exe'; // Executable name
        const absoluteInputAudioPath = path.resolve(originalAudioPath); // Absolute path to input audio

        // Construct the command to be run *from* the bin directory
        // Use relative path for the model, absolute paths for input/output
        const vocalRemoverCommand = `"${vocalRemoverExe}" -P "models/baseline.pth" --output_dir "${path.join(process.cwd(), 'temp')}" --input "${absoluteInputAudioPath}"`;

        console.log(
          `[${this.engineName}] Executing vocal remover command: ${vocalRemoverCommand} in CWD: ${binDir}`,
        );
        // Set CWD to the bin directory for execution
        await this._runCommand(vocalRemoverCommand, binDir);
        console.log(
          `[${this.engineName}] Vocal removal complete. Instrumental expected at: ${instrumentalAudioPath}`,
        );

        // Check if instrumental file exists
        try {
          await fs.promises.access(instrumentalAudioPath);
        } catch (accessError) {
          throw new Error(
            `Vocal remover did not produce the expected instrumental file: ${instrumentalAudioPath}`,
          );
        }
        this.updateProgress({ percent: 93 });

        // 3.3 Generate TTS and Merge for each language
        if (aiData.subtities && Object.keys(aiData.subtities).length > 0) {
          const languages = Object.keys(
            aiData.subtities,
          ) as (keyof typeof aiData.subtities)[];
          const totalLangs = languages.length;
          let langsProcessed = 0;

          for (const langCode of languages) {
            const langSubtitles = aiData.subtities[langCode];
            if (langSubtitles && langSubtitles.length > 0) {
              console.log(
                `[${this.engineName}] Starting dubbing process for language: ${langCode}`,
              );
              const langProgressStart = 93 + (langsProcessed / totalLangs) * 6; // Allocate 6% total for dubbing (93-99)
              this.updateProgress({
                percent: langProgressStart,
              });

              try {
                const finalDubbedPath = path.join(
                  outputDir,
                  `${baseName}.${langCode}.dubbed.mp3`, // Save final dubbed audio in outputDir
                );

                await this._generateDubbedAudio(
                  instrumentalAudioPath,
                  langSubtitles,
                  langCode,
                  tempAudioDir, // Use temp dir for intermediate files
                  finalDubbedPath, // Specify final output path
                  (detail) =>
                    this.updateProgress({
                      percent: langProgressStart + (detail.percent ?? 0) * 0.06,
                    }),
                );
                dubbedAudioPaths[langCode] = finalDubbedPath;
                console.log(
                  `[${this.engineName}] Dubbed audio for '${langCode}' saved to: ${finalDubbedPath}`,
                );
              } catch (dubError: any) {
                const errorMsg = `Failed to generate dubbed audio for '${langCode}': ${dubError.message}`;
                console.error(`[${this.engineName}] ${errorMsg}`, dubError);
                audioProcessingErrors[langCode] = errorMsg;
              }
            }
            langsProcessed++;
          }
        } else {
          console.log(`[${this.engineName}] No subtitles found for dubbing.`);
        }
      } catch (audioError: any) {
        const errorMsg = `Audio processing failed: ${audioError.message}`;
        console.error(`[${this.engineName}] ${errorMsg}`, audioError);
        // Store a general audio processing error if specific language errors didn't cover it
        if (Object.keys(audioProcessingErrors).length === 0) {
          audioProcessingErrors['general'] = errorMsg;
        }
      } finally {
        // Clean up temporary directory
        try {
          console.log(
            `[${this.engineName}] Cleaning up temporary directory: ${tempAudioDir}`,
          );
          await fs.promises.rm(tempAudioDir, { recursive: true, force: true });
          console.log(`[${this.engineName}] Temporary directory removed.`);
        } catch (cleanupError: any) {
          console.warn(
            `[${this.engineName}] Failed to remove temporary directory ${tempAudioDir}: ${cleanupError.message}`,
          );
        }
      }

      this.updateProgress({ percent: 99 });

      // const tempMovieId = '2fj6lumx893';
      // const _dubbedAudioPaths = {
      //   hi: path.resolve(
      //     path.join(
      //       'converted',
      //       'playback',
      //       tempMovieId,
      //       `${tempMovieId}.hi.dubbed.mp3`,
      //     ),
      //   ),
      //   pa: path.resolve(
      //     path.join(
      //       'converted',
      //       'playback',
      //       tempMovieId,
      //       `${tempMovieId}.pa.dubbed.mp3`,
      //     ),
      //   ),
      // };
      // === Step 4: Construct Final Output ===
      const outputData: AIEngineOutput['data'] = {
        title: aiData.title,
        description: aiData.description,
        genres: aiData.genres,
        // These fields are not in AiVideoAnalysisResponseSchema, remove or add to schema
        // keywords: aiData.keywords,
        // suggestedAgeRating: aiData.suggestedAgeRating,
        // contentWarnings: aiData.contentWarnings,
        chapters: chaptersVttPath ? { vttPath: chaptersVttPath } : undefined, // Store path instead of content
        // Add the generated subtitle paths
        subtitles:
          Object.keys(subtitlePaths).length > 0 ?
            { vttPaths: subtitlePaths }
          : undefined,
        posterImagePath: posterImagePath,
        backdropImagePath: backdropImagePath,
        // Include subtitle saving errors if any occurred
        ...(Object.keys(subtitleSaveErrors).length > 0 && {
          subtitleErrors: subtitleSaveErrors,
        }),
        // Add dubbed audio paths (pointing to temp files)
        ...(Object.keys(dubbedAudioPaths).length > 0 && {
          dubbedAudioPaths: dubbedAudioPaths,
        }),
        // Add the temporary directory path for cleanup by MediaManager
        ...(Object.keys(audioProcessingErrors).length > 0 && {
          audioProcessingErrors,
        }),
      };

      this.updateProgress({ percent: 100 });
      console.log(`[${this.engineName}] AI processing completed successfully.`);
      this.complete();
      return {
        success: true,
        output: {
          data: outputData,
        },
      };
    } catch (error: any) {
      // Ensure temp directory is cleaned up even if AI processing fails *before* returning
      if (tempAudioDir) {
        try {
          console.warn(
            `[${this.engineName}] Cleaning up temporary directory due to error: ${tempAudioDir}`,
          );
          await fs.promises.rm(tempAudioDir, { recursive: true, force: true });
        } catch (cleanupError: any) {
          console.error(
            `[${this.engineName}] Failed to remove temporary directory ${tempAudioDir} after error: ${cleanupError.message}`,
          );
        }
      }

      let errorMessage = 'An unexpected error occurred during AI processing.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      // Log the full error for debugging
      console.error(
        `[${this.engineName}] Error during AI processing:`,
        errorMessage,
        error,
      );
      this.fail(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // --- VTT Generation Helpers ---

  private _constructChaptersVtt(chapters: AiChaptersData): string {
    let vttContent = 'WEBVTT\n\n';
    // Sort chapters by timecode after converting to seconds
    chapters.sort(
      (a, b) =>
        this._timecodeToSeconds(a.timecode) -
        this._timecodeToSeconds(b.timecode),
    );

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const nextChapter = chapters[i + 1];
      const startTimeFormatted = this._formatVttTime(chapter.timecode); // Use timecode string

      // Determine end time: use next chapter's timecode or add a default duration (e.g., 5 minutes)
      let endTimeFormattedFinal: string;
      if (nextChapter) {
        endTimeFormattedFinal = this._formatVttTime(nextChapter.timecode);
      } else {
        // If last chapter, add a default duration (e.g., 5 minutes = 300 seconds)
        const startSeconds = this._timecodeToSeconds(chapter.timecode);
        // Need a function to convert seconds back to HH:MM:SS.mmm for the end time
        endTimeFormattedFinal = this._secondsToVttTime(startSeconds + 300);
      }

      // Format according to common VTT chapter structure:
      // Start time --> End time (Next start time or calculated end)
      // Chapter Title
      vttContent += `${startTimeFormatted} --> ${endTimeFormattedFinal}\n`;
      vttContent += `${chapter.chapterTitle}\n\n`;
    }

    return vttContent;
  }

  private _constructSubtitlesVtt(subtitles: AiSubtitleEntry[]): string {
    let vttContent = 'WEBVTT\n\n';

    for (const sub of subtitles) {
      if (sub.text.trim() === '') continue; // Skip empty subtitles

      const startTime = this._formatVttTime(sub.startTimecode); // Use startTimecode string
      const endTime = this._formatVttTime(sub.endTimecode); // Use endTimecode string

      // Basic VTT entry:
      // StartTime --> EndTime
      // Text
      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${sub.text.trim()}\n\n`;

      // Could add voice info as comments if needed later:
      // vttContent += `NOTE voice: ${sub.voiceGender}, ${sub.voiceType}\n\n`;
    }

    return vttContent;
  }

  // Helper to convert "M:SS" or "H:MM:SS" string to seconds
  private _timecodeToSeconds(timecode: string): number {
    const parts = timecode.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      // H:MM:SS
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // M:SS
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // SS (maybe?)
      seconds = parts[0];
    }
    // Handle potential NaN from parsing
    return isNaN(seconds) ? 0 : Math.max(0, seconds);
  }

  // Helper to convert seconds number back to HH:MM:SS.mmm format
  private _secondsToVttTime(seconds: number): string {
    const validSeconds = Math.max(0, seconds);
    const totalMilliseconds = Math.round(validSeconds * 1000);

    const ms = (totalMilliseconds % 1000).toString().padStart(3, '0');
    const totalSecondsInt = Math.floor(totalMilliseconds / 1000);
    const secs = (totalSecondsInt % 60).toString().padStart(2, '0');
    const totalMinutesInt = Math.floor(totalSecondsInt / 60);
    const minutes = (totalMinutesInt % 60).toString().padStart(2, '0'); // Renamed _minutes
    const hours = Math.floor(totalMinutesInt / 60)
      .toString()
      .padStart(2, '0');

    return `${hours}:${minutes}:${secs}.${ms}`;
  }

  // Main function to format timecode string to VTT time string
  private _formatVttTime(timecode: string): string {
    const seconds = this._timecodeToSeconds(timecode);
    return this._secondsToVttTime(seconds);
  }

  // --- Audio Processing Helpers ---

  private async _runCommand(
    command: string,
    cwd?: string,
  ): Promise<{ stdout: string; stderr: string }> {
    console.log(
      `[${this.engineName}] Executing command: ${command} in ${cwd || process.cwd()}`,
    );
    try {
      const { stdout, stderr } = await execPromise(command, { cwd });
      if (stderr) {
        // Log stderr as warning, as some tools output info here
        console.warn(`[${this.engineName}] Command stderr:\n${stderr}`);
      }
      console.log(`[${this.engineName}] Command stdout:\n${stdout}`);
      return { stdout, stderr };
    } catch (error: any) {
      console.error(
        `[${this.engineName}] Command failed: ${command}\nError: ${error.message}\nStdout: ${error.stdout}\nStderr: ${error.stderr}`,
      );
      throw new Error(
        `Command execution failed: ${error.message}. Stderr: ${error.stderr}`,
      );
    }
  }

  private _extractAudio(
    inputFile: string,
    outputAudioFile: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .noVideo() // Extract only audio
        .audioCodec('pcm_s16le') // Use WAV format (pcm_s16le) for compatibility
        .audioFrequency(44100) // Standard frequency
        .audioChannels(2) // Stereo
        .output(outputAudioFile)
        .on('error', (err) => {
          console.error(
            `[${this.engineName}] Error extracting audio: ${err.message}`,
          );
          reject(new Error(`Failed to extract audio: ${err.message}`));
        })
        .on('end', () => {
          console.log(
            `[${this.engineName}] Audio extraction finished: ${outputAudioFile}`,
          );
          resolve();
        })
        .run();
    });
  }

  private async _generateTTSAudio(
    text: string,
    languageCode: string, // e.g., 'hi-IN', 'pa-IN'
    voiceGender: 'male' | 'female',
    outputFile: string,
  ): Promise<void> {
    // Select voice based on language and gender
    // Using standard WaveNet voices. Adjust if specific voices are needed.
    let voiceName = '';
    if (languageCode.startsWith('hi')) {
      voiceName =
        voiceGender === 'male' ?
          'hi-IN-Chirp3-HD-Charon'
        : 'hi-IN-Chirp3-HD-Aoede';
    } else if (languageCode.startsWith('pa')) {
      voiceName =
        voiceGender === 'male' ? 'pa-IN-Wavenet-B' : 'pa-IN-Wavenet-C';
    } else {
      throw new Error(`Unsupported language code for TTS: ${languageCode}`);
    }

    const request = {
      input: { text: text },
      voice: { languageCode: languageCode, name: voiceName },
      // Use MP3 encoding for smaller file size, adjust if WAV is needed
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    try {
      console.log(
        `[${this.engineName}] Requesting TTS for "${text.substring(0, 30)}..." (Voice: ${voiceName})`,
      );
      const [response] = await this.ttsClient.synthesizeSpeech(request);
      if (!response.audioContent) {
        throw new Error('TTS response did not contain audio content.');
      }
      await fs.promises.writeFile(outputFile, response.audioContent, 'binary');
      console.log(
        `[${this.engineName}] TTS audio content written to file: ${outputFile}`,
      );
    } catch (error: any) {
      console.error(
        `[${this.engineName}] Google TTS API error for voice ${voiceName}: ${error.message}`,
      );
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  // Main function to generate the dubbed audio track for one language
  private async _generateDubbedAudio(
    instrumentalAudioPath: string,
    subtitles: AiSubtitleEntry[],
    langCode: string, // e.g., 'hi', 'pa' -> map to 'hi-IN', 'pa-IN'
    tempDir: string,
    finalOutputPath: string,
    onProgress: (detail: MediaEngineProgressDetail) => void, // Callback for progress updates
  ): Promise<void> {
    const ttsLangCode = langCode === 'hi' ? 'hi-IN' : 'pa-IN'; // Map to Google TTS codes
    const segmentFiles: string[] = []; // To store paths of generated TTS segments
    const ffmpegConcatListPath = path.join(
      tempDir,
      `ffmpeg_concat_${langCode}.txt`,
    );
    let concatFileContent = '';
    let lastEndTimeSec = 0;

    onProgress({ percent: 0 });

    // 1. Generate TTS for each subtitle entry
    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      const startTimeSec = this._timecodeToSeconds(sub.startTimecode);
      const endTimeSec = this._timecodeToSeconds(sub.endTimecode);
      const segmentPath = path.join(tempDir, `tts_${langCode}_${i}.mp3`);

      if (sub.text.trim()) {
        await this._generateTTSAudio(
          sub.text,
          ttsLangCode,
          sub.voiceGender,
          segmentPath,
        );

        // Add silence before this segment if needed
        const silenceDuration = Math.max(0, startTimeSec - lastEndTimeSec);
        if (silenceDuration > 0.01) {
          // Add entry for silence using ffmpeg's anullsrc
          // Note: Generating actual silence files might be more reliable than concat demuxer with anullsrc
          // For simplicity here, we'll assume the merge handles timing.
          // A more robust approach involves creating silence files or using adelay filter.
          // Let's try the adelay approach during merge.
        }

        segmentFiles.push(segmentPath); // Store path for later use
        lastEndTimeSec = endTimeSec; // Update last end time
      }
      // Update progress within the loop
      onProgress({ percent: ((i + 1) / subtitles.length) * 50 }); // TTS generation is ~50% of this step
    }

    onProgress({ percent: 50 });

    // 2. Assemble the full TTS track using fluent-ffmpeg (complex filtergraph)
    const assembledTTSPath = path.join(tempDir, `assembled_${langCode}.mp3`);

    if (segmentFiles.length === 0) {
      console.log(
        `[${this.engineName}] No TTS segments generated for ${langCode}, skipping assembly and merge.`,
      );
      // If there are no segments, we can't create the final output, so we should stop here.
      // Depending on requirements, you might want to create an empty file or just log.
      // For now, we return, indicating this language couldn't be dubbed.
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      const filterComplex: string[] = [];
      let outputStreams = '';

      // Add each segment file as an input
      segmentFiles.forEach((segmentPath, index) => {
        command.input(segmentPath);
        const sub = subtitles[index]; // Assuming segmentFiles aligns with subtitles that had text
        const startTimeMs = Math.round(
          this._timecodeToSeconds(sub.startTimecode) * 1000,
        );
        // Delay each input stream
        filterComplex.push(
          `[${index}:a]adelay=${startTimeMs}|${startTimeMs}[aud${index}]`,
        );
        outputStreams += `[aud${index}]`; // Collect stream names for mixing
      });

      // Add the final mixing filter with normalization
      filterComplex.push(
        `${outputStreams}amix=inputs=${segmentFiles.length}:normalize=1:dropout_transition=0[mixed]`,
      );
      // Add loudness normalization to ensure consistent volume
      filterComplex.push(`[mixed]dynaudnorm=p=0.95:m=20[mixout]`);

      command
        .complexFilter(filterComplex) // Apply the complex filtergraph
        .map('[mixout]') // Map the final mixed stream
        .audioCodec('libmp3lame')
        .audioQuality(2) // Equivalent to -q:a 2
        .output(assembledTTSPath)
        .on('start', (commandLine) => {
          console.log(
            `[${this.engineName}] Assembling TTS track for ${langCode} with command: ${commandLine}`,
          );
        })
        .on('error', (err, stdout, stderr) => {
          console.error(
            `[${this.engineName}] Error assembling TTS track for ${langCode}: ${err.message}`,
          );
          console.error(`[${this.engineName}] ffmpeg stderr: ${stderr}`);
          reject(
            new Error(
              `Failed to assemble TTS track for ${langCode}: ${err.message}`,
            ),
          );
        })
        .on('end', () => {
          console.log(
            `[${this.engineName}] Assembled TTS track saved to: ${assembledTTSPath}`,
          );
          resolve();
        })
        .run();
    });

    onProgress({
      percent: 80,
    });

    // 3. Merge Assembled TTS with Instrumental Track using fluent-ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(instrumentalAudioPath) // Input 0: Instrumental
        .input(assembledTTSPath) // Input 1: Assembled TTS
        .complexFilter([
          // First normalize the instrumental track for consistency
          '[0:a]dynaudnorm=p=0.95:m=20[instr_norm]',
          // Lower instrumental volume significantly to function as background
          '[instr_norm]volume=0.2:precision=fixed[instr_lowered]',

          // Normalize TTS volume for consistency
          '[1:a]dynaudnorm=p=0.95:m=20[tts_normalized]',
          // Apply boost to normalized TTS (voice)
          '[tts_normalized]volume=2.0[tts_boosted]',

          // Merge with volume-controlled instrumental (no additional normalization)
          '[instr_lowered][tts_boosted]amerge=inputs=2[aout]',
        ])
        .map('[aout]') // Map the final merged audio stream
        .audioCodec('libmp3lame')
        .audioQuality(2) // MP3 quality
        .output(finalOutputPath)
        .on('start', (commandLine) => {
          console.log(
            `[${this.engineName}] Merging final audio for ${langCode} with command: ${commandLine}`,
          );
        })
        .on('error', (err, stdout, stderr) => {
          console.error(
            `[${this.engineName}] Error merging final audio for ${langCode}: ${err.message}`,
          );
          console.error(`[${this.engineName}] ffmpeg stderr: ${stderr}`);
          reject(
            new Error(
              `Failed to merge final audio for ${langCode}: ${err.message}`,
            ),
          );
        })
        .on('end', () => {
          console.log(
            `[${this.engineName}] Final dubbed audio saved to: ${finalOutputPath}`,
          );
          resolve();
        })
        .run();
    });

    onProgress({ percent: 100 }); // Mark this language as done
  }
}
