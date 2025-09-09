import { EventEmitter } from 'events';

import type { InjectionToken } from 'tsyringe';

export interface ITranscriptionService extends EventEmitter {
  transcribe(audioPath: string, language: string): Promise<any>;
  on(event: 'progress', listener: (progress: number) => void): this;
}

export const DI_TOKENS = {
  TranscriptionService: Symbol(
    'TranscriptionService',
  ) as InjectionToken<ITranscriptionService>,
};
