'use server';

import { getAIServiceUrl } from '@/actions/admin/utils';
import { authorize } from '@/lib/safe-action';

const _generateImage = authorize(
  (_, accessToken) =>
    async (
      prompt: string,
      type: 'poster' | 'backdrop',
    ): Promise<{ success: boolean; path: string; id: string } | null> => {
      const aiServiceUrl = getAIServiceUrl();
      if (!aiServiceUrl) return null;

      try {
        const response = await fetch(`${aiServiceUrl}/images/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ prompt, type }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Unknown error');
        }

        return await response.json();
      } catch (error) {
        console.error(
          'Error generating image: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
        return null;
      }
    },
  ['ADMIN'],
);

export async function generateImage(
  prompt: string,
  type: 'poster' | 'backdrop',
): Promise<{ success: boolean; path: string; id: string } | null> {
  return _generateImage(prompt, type);
}

const _generateImagePrompt = authorize(
  (_, accessToken) =>
    async (input: {
      title: string;
      description: string;
      genres: string[];
      initialPrompt: string;
      type: 'poster' | 'backdrop';
    }): Promise<string | null> => {
      const aiServiceUrl = getAIServiceUrl();
      if (!aiServiceUrl) return null;

      try {
        const response = await fetch(`${aiServiceUrl}/images/prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Unknown error');
        }

        const result = await response.json();
        return result.prompt;
      } catch (error) {
        console.error(
          'Error generating image prompt: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
        return null;
      }
    },
  ['ADMIN'],
);

export async function generateImagePrompt(input: {
  title: string;
  description: string;
  genres: string[];
  initialPrompt: string;
  type: 'poster' | 'backdrop';
}): Promise<string | null> {
  return _generateImagePrompt(input);
}
