import { EventEmitter } from 'events';

import type { InjectionToken } from 'tsyringe';

export interface ITranscriptionService extends EventEmitter {
  transcribe(audioPath: string, language: string): Promise<any>;
  on(event: 'progress', listener: (progress: number) => void): this;
}

export const TranscriptionService = Symbol(
  'TranscriptionService',
) as InjectionToken<ITranscriptionService>;
