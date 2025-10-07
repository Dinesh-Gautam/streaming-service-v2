'use server';

import { cookies } from 'next/headers';

import type { MediaJob } from '@monorepo/core';

const getJobServiceUrl = (): string | null => {
  const jobServiceUrl = process.env.NEXT_PUBLIC_JOB_SERVICE_URL;
  if (!jobServiceUrl) {
    console.error('Job service URL is not configured.');
    return null;
  }
  return jobServiceUrl;
};

export const initiateJob = async (
  mediaId: string,
  filePath: string,
): Promise<{ jobId: string } | null> => {
  const jobServiceUrl = getJobServiceUrl();
  if (!jobServiceUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    console.error('Authentication token not found.');
    return null;
  }

  try {
    const response = await fetch(`${jobServiceUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ mediaId, sourceUrl: filePath }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Unknown error');
    }

    return await response.json();
  } catch (error) {
    console.error(
      'Error initiating job: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
    return null;
  }
};

export const getJobByMediaId = async (
  mediaId: string,
): Promise<MediaJob | null> => {
  const jobServiceUrl = getJobServiceUrl();
  if (!jobServiceUrl) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    console.error('Authentication token not found.');
    return null;
  }

  try {
    const response = await fetch(`${jobServiceUrl}/jobs/by-media/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unknown error');
    }
    return (await response.json()) as MediaJob;
  } catch (error) {
    console.error(
      'Error fetching job by media ID: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
    );
    return null;
  }
};

export const retryJob = async (
  mediaId: string,
): Promise<{ success: boolean; message: string }> => {
  const jobServiceUrl = getJobServiceUrl();
  if (!jobServiceUrl) {
    return { success: false, message: 'Job service URL is not configured.' };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    return { success: false, message: 'Authentication token not found.' };
  }

  try {
    const response = await fetch(`${jobServiceUrl}/jobs/${mediaId}/retry`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'Job retry initiated successfully.' };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: `Failed to retry job: ${errorData.error || 'Unknown error'}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Error retrying job: ${error.message}`,
    };
  }
};
