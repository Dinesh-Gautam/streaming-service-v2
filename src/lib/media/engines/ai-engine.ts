import * as fs from 'fs';
import * as path from 'path';

// Genkit Core and Google AI Plugin
// Assume genkit is configured globally, e.g., in genkit.config.ts

// Import base class and types
import { z } from 'zod'; // Using Zod for parsing the structured output

import { AiResponseSchema, AnalyzeSubtitlesFlow } from '@/lib/ai/flow';

import { AIEngineOutput, SubtitleOutput } from '../engine-outputs';
import { EngineOutput, MediaEngine } from '../media-engine';

// Interface for options passed to the AI Engine's process method
interface AIEngineProcessOptions {
  subtitleOutput?: SubtitleOutput;
}

type AiResponseType = z.infer<typeof AiResponseSchema>;

// Specify the output type for this engine
export class AIEngine extends MediaEngine<AIEngineOutput> {
  constructor() {
    super('AIEngine');
    // Constructor remains minimal, API key checked in process
  }

  async process(
    inputFile: string,
    outputDir: string,
    options?: AIEngineProcessOptions,
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

    // --- Input Validation ---
    const subtitleOutput = options?.subtitleOutput;
    if (
      !subtitleOutput?.paths?.vtt ||
      Object.keys(subtitleOutput.paths.vtt).length === 0
    ) {
      const errorMsg = 'Missing subtitle VTT file paths in input options.';
      console.error(`[${this.engineName}] ${errorMsg}`);
      this.fail(errorMsg);
      return { success: false, error: errorMsg };
    }

    const vttPaths = subtitleOutput.paths.vtt;
    const sourceLangCode = Object.keys(vttPaths)[0];
    const sourceVttPath = vttPaths[sourceLangCode];

    if (!sourceVttPath || !fs.existsSync(sourceVttPath)) {
      const errorMsg = `Source VTT file not found at path: ${sourceVttPath}`;
      console.error(`[${this.engineName}] ${errorMsg}`);
      this.fail(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      // --- Read VTT Content ---
      console.log(
        `[${this.engineName}] Reading VTT content from: ${sourceVttPath}`,
      );
      let vttContent = await fs.promises.readFile(sourceVttPath, 'utf-8');
      this.updateProgress({ percent: 10 });

      // --- Basic VTT Cleaning (Optional but recommended) ---
      // Remove VTT header and empty lines to reduce token count
      vttContent = vttContent
        .replace(/^WEBVTT\s*/, '')
        .replace(/^\s*[\r\n]/gm, '');
      // Consider further cleaning/chunking if VTT is very large

      // --- Call Genkit Generate ---
      console.log(`[${this.engineName}] Sending request to Gemini model...`);
      this.updateProgress({ percent: 25 });

      console.log(vttContent);
      const { text } = await AnalyzeSubtitlesFlow({ vttContent });

      if (!text) {
        throw new Error('AI model returned empty or invalid data.');
      }

      const output = JSON.parse(text);
      console.log(output);

      this.updateProgress({ percent: 80 }); // Progress after receiving response

      const aiData = output as AiResponseType; // Gets structured output based on schema

      console.log(`[${this.engineName}] Received and parsed AI response.`);

      const chaptersVttContent =
        aiData.chaptersVtt ?
          {
            vttContent: this._constructChapters(aiData.chaptersVtt),
          }
        : undefined;

      // --- Construct Output ---
      const outputData: AIEngineOutput['data'] = {
        title: aiData.title,
        description: aiData.description,
        genres: aiData.genres,
        keywords: aiData.keywords,
        suggestedAgeRating: aiData.suggestedAgeRating,
        contentWarnings: aiData.contentWarnings,
        chapters: chaptersVttContent,
      };

      console.log(outputData);

      // --- Save Chapters VTT (if generated) ---
      if (outputData.chapters?.vttContent) {
        const chaptersVttPath = path.join(
          outputDir,
          `${path.parse(inputFile).name}.chapters.vtt`,
        );
        try {
          await fs.promises.writeFile(
            chaptersVttPath,
            outputData.chapters.vttContent,
          );
          console.log(
            `[${this.engineName}] Chapters VTT saved to: ${chaptersVttPath}`,
          );
        } catch (writeError: any) {
          console.warn(
            `[${this.engineName}] Failed to save chapters VTT file: ${writeError.message}`,
          );
          // Don't fail the engine for this, just log a warning.
        }
      } else {
        console.log(`[${this.engineName}] No chapter VTT generated by AI.`);
      }

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

  private _constructChapters(
    chaptersVtt: NonNullable<AiResponseType['chaptersVtt']>,
  ): string {
    const vttContent = chaptersVtt.map((chapter, index) => {
      return `${this._formatVttTime(chapter.startTime)} --> ${chaptersVtt[index + 1] ? this._formatVttTime(chaptersVtt[index + 1].startTime - 1) : 'end'}\n${chapter.chapterTitle}\n\n`;
    });

    vttContent.unshift('WEBVTT\n\n');

    return vttContent.join('');
  }

  private _formatVttTime(seconds: number): string {
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${secs}.${ms}`;
  }
}
