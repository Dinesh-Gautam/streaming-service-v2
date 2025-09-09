export interface SubtitleJobPayload {
  mediaId: string;
  sourceFileUrl: string; // URL or path to the source video
  outputDir: string;
  sourceLanguage: string;
  targetLanguages: string[];
}
