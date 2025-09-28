import { EventEmitter } from 'events';
import { injectable } from 'tsyringe';

import type { ITranslationService } from '@subtitle-worker/interfaces/translation.interface';

import { TranslationServiceClient } from '@google-cloud/translate';
import config from '@subtitle-worker/config';

@injectable()
export class GoogleTranslationService
  extends EventEmitter
  implements ITranslationService
{
  private translateClient: TranslationServiceClient;
  private googleProjectId: string | null = null;

  constructor() {
    super();
    // The Google Cloud SDK automatically finds credentials via the
    // GOOGLE_APPLICATION_CREDENTIALS environment variable.
    this.translateClient = new TranslationServiceClient({
      projectId: config.GOOGLE_PROJECT_ID,
    });

    this.googleProjectId = config.GOOGLE_PROJECT_ID;
  }

  public async translateVtt(
    vttContent: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    if (!this.googleProjectId) {
      throw new Error(
        'Google Project ID has not been initialized. Check credentials.',
      );
    }

    try {
      this.emit('progress', 0);
      const request = {
        parent: `projects/${this.googleProjectId}/locations/global`,
        contents: [vttContent],
        mimeType: 'text/plain', // VTT is treated as plain text for translation
        sourceLanguageCode: sourceLang,
        targetLanguageCode: targetLang,
      };

      const [response] = await this.translateClient.translateText(request);

      if (
        !response.translations ||
        response.translations.length === 0 ||
        !response.translations[0].translatedText
      ) {
        throw new Error('Google Translate API returned no valid translation.');
      }

      const translatedVttContent = response.translations[0].translatedText;
      console.log(
        `[GoogleTranslationService] Received translated VTT content for ${targetLang}.`,
      );
      this.emit('progress', 100);
      return translatedVttContent;
    } catch (error: any) {
      console.error(
        `[GoogleTranslationService] Google Translate API error:`,
        error,
      );
      throw new Error(`Translation failed for ${targetLang}: ${error.message}`);
    }
  }
}
