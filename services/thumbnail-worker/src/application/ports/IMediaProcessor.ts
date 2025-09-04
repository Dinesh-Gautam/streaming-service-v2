import { EventEmitter } from 'events';

export interface ThumbnailOutput {
  paths: {
    vtt: string;
    thumbnailsDir: string;
  };
}

export interface EngineOutput<T> {
  success: boolean;
  output?: T;
  error?: string;
}

export interface IMediaProcessor extends EventEmitter {
  process(
    inputFile: string,
    outputDir: string,
  ): Promise<EngineOutput<ThumbnailOutput>>;

  on(event: 'progress', listener: (progress: number) => void): this;
}
