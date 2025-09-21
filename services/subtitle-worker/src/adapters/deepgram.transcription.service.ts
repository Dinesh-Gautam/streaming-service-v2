import { EventEmitter } from 'events';
import * as fs from 'fs';
import { injectable } from 'tsyringe';

import {
  createClient,
  DeepgramClient,
  SyncPrerecordedResponse,
} from '@deepgram/sdk';
import { ITranscriptionService } from '@monorepo/core';

@injectable()
export class DeepgramTranscriptionService
  extends EventEmitter
  implements ITranscriptionService
{
  private deepgram: DeepgramClient;

  constructor() {
    super();
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set.');
    }
    this.deepgram = createClient(deepgramApiKey);
  }

  public async transcribe(
    audioPath: string,
    language: string,
  ): Promise<SyncPrerecordedResponse['results']> {
    try {
      this.emit('progress', 0);
      const audioBuffer = await fs.promises.readFile(audioPath);
      const { result, error } =
        await this.deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
          model: 'nova-2',
          language: language,
          punctuate: true,
          utterances: true,
        });

      if (error) {
        console.error(
          `[DeepgramTranscriptionService] Deepgram API error:`,
          error,
        );
        throw new Error(`Deepgram transcription failed: ${error.message}`);
      }
      if (!result) {
        throw new Error('Deepgram transcription returned no result.');
      }

      console.log(
        `[DeepgramTranscriptionService] Transcription received from Deepgram.`,
      );
      this.emit('progress', 100);
      return result.results;
    } catch (err: any) {
      console.error(
        `[DeepgramTranscriptionService] Error during transcription:`,
        err,
      );
      throw new Error(`Failed to transcribe audio: ${err.message || err}`);
    }
  }
}
