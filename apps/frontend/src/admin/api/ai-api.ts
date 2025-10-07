'use server';

import { cookies } from 'next/headers';

const getAIServiceUrl = (): string | null => {
  const aiServiceUrl = process.env.NEXT_PUBLIC_AI_WORKER_URL;
  if (!aiServiceUrl) {
    console.error('AI service URL is not configured.');
    return null;
  }
  return aiServiceUrl;
};

export const generateImage = async (
  prompt: string,
  type: 'poster' | 'backdrop',
): Promise<{ success: boolean; path: string; id: string } | null> => {
  const aiServiceUrl = getAIServiceUrl();
  if (!aiServiceUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    console.error('Authentication token not found.');
    return null;
  }

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
};

export const generateImagePrompt = async (input: {
  title: string;
  description: string;
  genres: string[];
  initialPrompt: string;
  type: 'poster' | 'backdrop';
}): Promise<string | null> => {
  const aiServiceUrl = getAIServiceUrl();
  if (!aiServiceUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    console.error('Authentication token not found.');
    return null;
  }

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
};
