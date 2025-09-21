import { EventEmitter } from 'events';

export interface IAudioExtractor extends EventEmitter {
  extractAudio(inputFile: string, outputDir: string): Promise<string>;
  on(event: 'progress', listener: (progress: number) => void): this;
}
