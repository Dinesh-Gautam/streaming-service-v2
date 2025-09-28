import { Buffer } from 'buffer';
import * as fs from 'fs/promises';
import dataUrl from 'data-urls';
import { injectable } from 'tsyringe';

import { googleAI } from '@genkit-ai/google-genai';

import { ai } from '../config/ai.config';
import { logger } from '../config/logger';
import { AiSubtitleEntry } from '../models/types';
import { ITtsService } from './tts.service.interface';

export const GeminiTtsServiceToken = Symbol('GeminiTtsService');

@injectable()
export class GeminiTtsService implements ITtsService {
  private name = 'GeminiTtsService';

  constructor() {
    logger.info(`[${this.name}] Initialized.`);
  }

  async generateTTSAudio(
    text: string,
    outputFile: string,
    voiceGender?: AiSubtitleEntry['voiceGender'],
  ): Promise<string> {
    try {
      const voiceName = voiceGender === 'female' ? 'Kore' : 'Charon';
      logger.info(
        `[${this.name}] Requesting TTS for text (Voice: ${voiceName})`,
      );
      const response = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        prompt: text,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

      const audioDataUrl = response.media?.url;

      if (!audioDataUrl) {
        logger.error(
          `[${this.name}] TTS response did not contain audio content for text.`,
        );
        throw new Error('TTS response did not contain audio content.');
      }
      const parsedDataUrl = dataUrl(audioDataUrl);
      if (!parsedDataUrl) {
        throw new Error('Failed to parse data URL.');
      }
      const mimeType = parsedDataUrl.mimeType.toString();
      const rawData = parsedDataUrl.body;
      let audioBuffer = rawData;
      const finalOutputFile = `${outputFile}.wav`;

      if (mimeType.includes('l16')) {
        const sampleRateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate =
          sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
        const header = this.createWavHeader(rawData.length, 1, sampleRate, 16);
        audioBuffer = Buffer.concat([header, rawData]);
      }

      await fs.writeFile(finalOutputFile, audioBuffer);
      logger.info(
        `[${this.name}] TTS audio content written to file: ${finalOutputFile}`,
      );
      return finalOutputFile;
    } catch (error: any) {
      logger.error(
        `[${this.name}] Google TTS API error: ${error.message}`,
        error,
      );
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  private createWavHeader(
    dataLength: number,
    numChannels: number,
    sampleRate: number,
    bitsPerSample: number,
  ): Buffer {
    const buffer = Buffer.alloc(44);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;

    // RIFF identifier
    buffer.write('RIFF', 0);
    // RIFF chunk size
    buffer.writeUInt32LE(36 + dataLength, 4);
    // WAVE identifier
    buffer.write('WAVE', 8);
    // FMT identifier
    buffer.write('fmt ', 12);
    // FMT chunk size
    buffer.writeUInt32LE(16, 16);
    // Audio format (1 for PCM)
    buffer.writeUInt16LE(1, 20);
    // Number of channels
    buffer.writeUInt16LE(numChannels, 22);
    // Sample rate
    buffer.writeUInt32LE(sampleRate, 24);
    // Byte rate
    buffer.writeUInt32LE(byteRate, 28);
    // Block align
    buffer.writeUInt16LE(blockAlign, 32);
    // Bits per sample
    buffer.writeUInt16LE(bitsPerSample, 34);
    // Data identifier
    buffer.write('data', 36);
    // Data chunk size
    buffer.writeUInt32LE(dataLength, 40);

    return buffer;
  }
}
