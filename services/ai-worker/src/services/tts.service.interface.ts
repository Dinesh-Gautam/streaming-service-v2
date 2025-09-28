import { AiSubtitleEntry } from '../models/types';

export interface ITtsService {
  generateTTSAudio(
    text: string,
    outputFile: string,
    voiceGender?: AiSubtitleEntry['voiceGender'],
    languageCode?: string,
  ): Promise<string>;
}
