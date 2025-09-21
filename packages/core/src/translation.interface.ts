import { EventEmitter } from 'events';

import type { InjectionToken } from 'tsyringe';

export interface ITranslationService extends EventEmitter {
  translateVtt(
    vttContent: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string>;
  on(event: 'progress', listener: (progress: number) => void): this;
}

// export const DI_TOKENS = {
//   TranslationService: Symbol(
//     'TranslationService',
//   ) as InjectionToken<ITranslationService>,
// };
