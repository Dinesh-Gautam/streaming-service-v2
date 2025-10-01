'use client';

import { useEffect, useState } from 'react';

import type { JobStatus, MediaJob } from '@monorepo/core';

import { getJobByMediaId } from '@/admin/api/job-api';

const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed'];

// Overload signatures
export function useJobStatus(
  mediaId: string | null,
  pollTrigger?: number,
): {
  jobStatus: MediaJob | null;
  error: string | null;
  isPolling: boolean;
};
export function useJobStatus(
  mediaIds: string[] | null,
  pollTrigger?: number,
): {
  jobStatus: Record<string, MediaJob> | null;
  error: string | null;
  isPolling: boolean;
};

export function useJobStatus(
  mediaIdorIds: string | string[] | null,
  pollTrigger: number = 0,
) {
  const [jobStatus, setJobStatus] = useState<
    MediaJob | Record<string, MediaJob> | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (
      !mediaIdorIds ||
      (Array.isArray(mediaIdorIds) && !mediaIdorIds.length)
    ) {
      setJobStatus(null);
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let idsToPoll = Array.isArray(mediaIdorIds) ? [...mediaIdorIds] : [];

    const fetchStatus = async () => {
      try {
        if (Array.isArray(mediaIdorIds)) {
          if (idsToPoll.length === 0) {
            if (intervalId) clearInterval(intervalId);
            setIsPolling(false);
            return;
          }

          const results = await Promise.all(
            idsToPoll.map((id) => getJobByMediaId(id)),
          );
          const successfulJobs = results.filter(
            (job): job is MediaJob => !!job,
          );

          if (successfulJobs.length > 0) {
            const statusMap = successfulJobs.reduce(
              (acc, job) => {
                acc[job.mediaId] = job;
                return acc;
              },
              {} as Record<string, MediaJob>,
            );

            setJobStatus((prev) => ({
              ...((prev as Record<string, MediaJob>) || {}),
              ...statusMap,
            }));
          }

          idsToPoll = successfulJobs
            .filter((job) => !TERMINAL_STATUSES.includes(job.status))
            .map((job) => job.mediaId);
        } else {
          const data = await getJobByMediaId(mediaIdorIds as string);
          if (data) {
            setJobStatus(data);

            if (TERMINAL_STATUSES.includes(data.status)) {
              if (intervalId) clearInterval(intervalId);
              setIsPolling(false);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching job status:', err);
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred.',
        );
        if (intervalId) clearInterval(intervalId);
        setIsPolling(false);
      }
    };

    setIsPolling(true);
    fetchStatus();
    intervalId = setInterval(fetchStatus, 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      setIsPolling(false);
    };
  }, [mediaIdorIds, pollTrigger]);

  return { jobStatus, error, isPolling };
}
