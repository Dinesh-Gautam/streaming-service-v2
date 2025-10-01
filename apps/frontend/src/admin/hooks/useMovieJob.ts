import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import type { MediaJob } from '@monorepo/core';

import { useJobStatus } from '@/admin/hooks/use-job-status';
import { getJobByMediaId, retryJob } from '@/app/(admin)/admin/movies/_action';

interface JobCreationResponse {
  jobId: string;
  error?: string;
}

export function useMovieJobProcessing(mediaId: string | null) {
  const [pollTrigger, setPollTrigger] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { jobStatus: polledStatus, error: jobError } = useJobStatus(
    mediaId,
    pollTrigger,
  );

  const [processingStatus, setProcessingStatus] = useState<MediaJob | null>(
    null,
  );

  useEffect(() => {
    setProcessingStatus(null);
  }, [mediaId]);

  useEffect(() => {
    if (polledStatus) {
      setProcessingStatus(polledStatus);
      if (polledStatus.status !== 'failed') {
        setIsRetrying(false);
      }
    }
  }, [polledStatus]);

  useEffect(() => {
    if (jobError) {
      toast.error('Job Status Error', { description: jobError });
    }
  }, [jobError]);

  useEffect(() => {
    async function fetchInitialJob() {
      if (mediaId) {
        const { job } = await getJobByMediaId(mediaId);
        if (job) {
          setProcessingStatus(job);
        }
      }
    }
    fetchInitialJob();
  }, [mediaId]);

  const initiateJob = useCallback(async (mediaId: string, filePath: string) => {
    const jobServiceUrl = process.env.NEXT_PUBLIC_JOB_SERVICE_URL;
    if (!jobServiceUrl) {
      toast.error('Job service URL is not configured.');
      return;
    }

    try {
      const response = await fetch(`${jobServiceUrl}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, sourceUrl: filePath }),
      });

      const result: JobCreationResponse = await response.json();

      if (response.ok && result.jobId) {
        toast.success(`Job initiated successfully\nJob ID: ${result.jobId}`);
        setPollTrigger((prev) => prev + 1);
      } else {
        toast.error(
          'Failed to initiate job\n' + (result.error || 'Unknown error'),
        );
      }
    } catch (error) {
      toast.error(
        'Error initiating job\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }, []);

  const handleRetryJob = useCallback(async (mediaId: string) => {
    setIsRetrying(true);
    const result = await retryJob(mediaId);
    if (result.success) {
      toast.success(result.message);
      setPollTrigger((prev) => prev + 1); // Trigger polling again
    } else {
      toast.error(result.message);
      setIsRetrying(false);
    }
  }, []);

  return {
    processingStatus,
    initiateJob,
    handleRetryJob,
    isRetrying,
  };
}
