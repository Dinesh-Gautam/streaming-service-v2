export interface SubtitleResult {
  vttPaths: Record<string, string>; // { 'en': 'path/to/en.vtt', 'hi': 'path/to/hi.vtt' }
  transcriptionData?: any; // Raw transcription for debugging/future use
  translationErrors?: Record<string, string>;
}
