import { genkit } from 'genkit';

import { googleAI } from '@genkit-ai/google-genai';

import config from './index';

export const ai = genkit({
  plugins: [googleAI({ apiKey: config.GOOGLE_API_KEY })],
});
