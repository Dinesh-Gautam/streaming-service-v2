'use server';

import type { MediaJob } from '@monorepo/core';

import { getJobServiceUrl } from '@/actions/admin/utils';
import { authorize } from '@/lib/safe-action';

export const initiateJob = authorize(
  (_, accessToken) =>
    async (
      mediaId: string,
      filePath: string,
    ): Promise<{ jobId: string } | null> => {
      const jobServiceUrl = getJobServiceUrl();
      if (!jobServiceUrl) return null;

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
    },
  ['ADMIN'],
);

export const getJobByMediaId = authorize(
  (_, accessToken) =>
    async (mediaId: string): Promise<MediaJob | null> => {
      const jobServiceUrl = getJobServiceUrl();
      if (!jobServiceUrl) return null;

      try {
        const response = await fetch(
          `${jobServiceUrl}/jobs/by-media/${mediaId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
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
    },
  ['ADMIN'],
);

export const retryJob = authorize(
  (_, accessToken) =>
    async (mediaId: string): Promise<{ success: boolean; message: string }> => {
      const jobServiceUrl = getJobServiceUrl();
      if (!jobServiceUrl) {
        return {
          success: false,
          message: 'Job service URL is not configured.',
        };
      }

      try {
        const response = await fetch(`${jobServiceUrl}/jobs/${mediaId}/retry`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          return {
            success: true,
            message: 'Job retry initiated successfully.',
          };
        } else {
          const errorData = await response.json();
          return {
            success: false,
            message: `Failed to retry job: ${
              errorData.error || 'Unknown error'
            }`,
          };
        }
      } catch (error: any) {
        return {
          success: false,
          message: `Error retrying job: ${error.message}`,
        };
      }
    },
  ['ADMIN'],
);
