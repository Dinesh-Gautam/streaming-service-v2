/**
 * Defines the structure for the outputPaths and data returned by ThumbnailEngine.
 */
export interface ThumbnailOutput {
  paths?: {
    vtt: string; // Path to the generated VTT file
    thumbnailsDir: string; // Path to the directory containing thumbnail images
  };
}

/**
 * Defines the structure for the outputPaths and data returned by TranscodingEngine.
 */
export interface TranscodingOutput {
  paths?: {
    manifest: string; // Path to the generated DASH manifest (.mpd)
  };
}

/**
 * Defines the structure for the outputPaths and data returned by SubtitleEngine.
 * Includes the raw transcription result from Deepgram.
 */
export interface SubtitleOutput {
  paths?: {
    // Key: language code (e.g., 'en', 'hi', 'pa'), Value: path to VTT file
    vtt: Record<string, string>;
  };
  // Define a more specific type for Deepgram's result if possible,
  // or use 'any' if the structure is highly variable or complex.
  // For now, using 'any' as a placeholder.
  data?: any; // Raw transcription result from Deepgram
}

// Discriminated union for all possible engine outputs
export type EngineTaskOutput =
  | ThumbnailOutput
  | TranscodingOutput
  | SubtitleOutput;
