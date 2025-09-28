import * as fs from 'fs/promises';
import { injectable } from 'tsyringe';

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

import config from '../config';
import { logger } from '../config/logger';
import { AiSubtitleEntry } from '../models/types';
import { ITtsService } from './tts.service.interface';

export const TtsServiceToken = Symbol('TtsService');

@injectable()
export class TtsService implements ITtsService {
  private ttsClient: TextToSpeechClient;
  private name = 'TtsService';

  constructor() {
    try {
      this.ttsClient = new TextToSpeechClient({
        projectId: config.GOOGLE_PROJECT_ID,
      });
      logger.info(`[${this.name}] Google TTS Client Initialized.`);
    } catch (error: any) {
      logger.error(
        `[${this.name}] Failed to initialize Google TTS Client: ${error.message}`,
      );
      this.ttsClient = null as any;
    }
  }

  isInitialized(): boolean {
    return !!this.ttsClient;
  }

  async generateTTSAudio(
    text: string,
    outputFile: string,
    languageCode?: string,
    voiceGender?: AiSubtitleEntry['voiceGender'],
  ): Promise<string> {
    if (!this.isInitialized()) {
      logger.error(`[${this.name}] TTS Client is not initialized.`);
      throw new Error('TTS Client is not initialized.');
    }
    const voiceMap = {
      'hi-IN': {
        male: 'hi-IN-Chirp3-HD-Charon',
        female: 'hi-IN-Chirp3-HD-Aoede',
      },
      'pa-IN': { male: 'pa-IN-Wavenet-B', female: 'pa-IN-Wavenet-C' },
    };
    const voiceName =
      voiceMap[languageCode as keyof typeof voiceMap]?.[
        voiceGender as AiSubtitleEntry['voiceGender']
      ];
    if (!voiceName) {
      logger.error(
        `[${this.name}] Unsupported language/gender for TTS: ${languageCode}/${voiceGender}`,
      );
      throw new Error(
        `Unsupported language/gender for TTS: ${languageCode}/${voiceGender}`,
      );
    }
    const request = {
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' as const },
    };
    try {
      logger.info(
        `[${this.name}] Requesting TTS for "${text.substring(0, 30)}..." (Voice: ${voiceName})`,
      );
      const [response] = await this.ttsClient.synthesizeSpeech(request);
      if (!response.audioContent) {
        logger.error(
          `[${this.name}] TTS response did not contain audio content for text: "${text.substring(0, 30)}..."`,
        );
        throw new Error('TTS response did not contain audio content.');
      }
      await fs.writeFile(outputFile, response.audioContent, 'binary');
      logger.info(
        `[${this.name}] TTS audio content written to file: ${outputFile}`,
      );
      return outputFile;
    } catch (error: any) {
      logger.error(
        `[${this.name}] Google TTS API error for voice ${voiceName} and text "${text.substring(0, 30)}...": ${error.message}`,
        error,
      );
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }
}
