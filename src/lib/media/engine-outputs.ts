import { z } from 'zod';

// --- Base Output Structure ---
export interface BaseEngineOutputData {
  // Common fields can go here if needed in the future
}

// --- Subtitle Engine Output ---
export interface SubtitleOutputData extends BaseEngineOutputData {
  paths: {
    vtt: Record<string, string>; // e.g., { 'en': '/path/to/en.vtt', 'hi': '/path/to/hi.vtt' }
  };
  data?: any; // Raw transcription or translation details
  translations?: {
    errors?: Record<string, string>; // e.g., { 'pa': 'Translation failed: API error' }
  };
}

export interface SubtitleOutput {
  data: SubtitleOutputData;
}

// --- Thumbnail Engine Output ---
export interface ThumbnailOutputData extends BaseEngineOutputData {
  paths: {
    vtt: string; // Path to the thumbnail VTT file
    basePath: string; // Base path for the generated thumbnails (e.g., /path/to/output/thumbnails/thumb)
    count: number; // Number of thumbnails generated
  };
}
export interface ThumbnailOutput {
  data: ThumbnailOutputData;
}

// --- Transcoding Engine Output ---
export interface TranscodingOutputData extends BaseEngineOutputData {
  paths: {
    playlist: string; // Path to the HLS playlist (m3u8)
    outputDir: string; // Directory containing segments and playlist
  };
  // Add any other relevant transcoding data, e.g., resolutions, bitrates
}
export interface TranscodingOutput {
  data: TranscodingOutputData;
}

// --- AI Engine Output ---
export interface AIEngineOutputData extends BaseEngineOutputData {
  title?: string;
  description?: string;
  genres?: string[];
  // keywords?: string[]; // Removed as not in AI schema
  // suggestedAgeRating?: string; // Removed as not in AI schema
  // contentWarnings?: string[]; // Removed as not in AI schema
  chapters?: {
    vttPath?: string; // Corrected: Path to the generated chapters VTT file
  };
  subtitles?: {
    // Added for AI-generated subtitles
    vttPaths: Record<string, string>; // e.g., { 'hi': 'path/to/hi.vtt', 'pa': 'path/to/pa.vtt' }
  };
  subtitleErrors?: Record<string, string>; // Added to report subtitle saving errors
  posterImagePath?: string;
  backdropImagePath?: string;
}

export interface AIEngineOutput {
  data: AIEngineOutputData;
}

// --- Combined Output Type (Example for MediaManager) ---
// This could represent the final combined output after all engines run
export interface CombinedMediaOutput {
  subtitle?: SubtitleOutputData;
  thumbnail?: ThumbnailOutputData;
  transcoding?: TranscodingOutputData;
  ai?: AIEngineOutputData;
  // Add other engine outputs as needed
}
