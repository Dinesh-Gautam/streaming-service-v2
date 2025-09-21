import { EventEmitter } from 'events';

import type { InjectionToken } from 'tsyringe';

export interface IAudioExtractor extends EventEmitter {
  extractAudio(inputFile: string, outputDir: string): Promise<string>;
  on(event: 'progress', listener: (progress: number) => void): this;
}

// export const DI_TOKENS = {
//   AudioExtractor: Symbol('AudioExtractor') as InjectionToken<IAudioExtractor>,
// };
