export interface IMediaProcessor {
  generateThumbnail(
    videoUrl: string,
    outputDir: string,
  ): Promise<{ thumbnailUrl: string }>;
}
