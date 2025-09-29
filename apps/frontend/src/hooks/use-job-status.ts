'use client';

import { useEffect, useState } from 'react';

import type { JobStatus, MediaJob } from '@monorepo/core';

const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed'];

export function useJobStatus(jobId: string | null) {
  const [jobStatus, setJobStatus] = useState<MediaJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJobStatus(null);
      return;
    }

    const jobServiceUrl = process.env.NEXT_PUBLIC_JOB_SERVICE_URL;
    if (!jobServiceUrl) {
      setError('Job service URL is not configured.');
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${jobServiceUrl}/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch job status: ${response.statusText}`);
        }
        const data: MediaJob = await response.json();
        setJobStatus(data);

        if (TERMINAL_STATUSES.includes(data.status)) {
          if (intervalId) clearInterval(intervalId);
          setIsPolling(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred.',
        );
        if (intervalId) clearInterval(intervalId);
        setIsPolling(false);
      }
    };

    // Start polling
    setIsPolling(true);
    fetchStatus(); // Initial fetch
    intervalId = setInterval(fetchStatus, 1000); // Poll every 1 seconds

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      setIsPolling(false);
    };
  }, [jobId]);

  return { jobStatus, error, isPolling };
}
