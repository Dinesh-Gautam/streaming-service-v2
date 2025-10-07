import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import type { MediaJob } from '@monorepo/core';

import {
  getJobByMediaId,
  initiateJob as initiateJobApi,
  retryJob,
} from '@/actions/admin/job';
import { useJobStatus } from '@/admin/hooks/use-job-status';

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

  // useEffect(() => {
  //   async function fetchInitialJob() {
  //     if (mediaId) {
  //       const job = await getJobByMediaId(mediaId);
  //       if (job) {
  //         setProcessingStatus(job);
  //       }
  //     }
  //   }
  //   fetchInitialJob();
  // }, [mediaId]);

  useEffect(() => {
    async function fetchInitialJob() {
      if (mediaId) {
        const job = await getJobByMediaId(mediaId);
        if (job) {
          setProcessingStatus(job);
          // If the job is not in a terminal state, start polling
          if (!['completed', 'failed'].includes(job.status)) {
            setPollTrigger((prev) => prev + 1);
          }
        }
      }
    }
    fetchInitialJob();
  }, [mediaId]);

  const initiateJob = useCallback(async (mediaId: string, filePath: string) => {
    const result = await initiateJobApi(mediaId, filePath);
    if (result?.jobId) {
      toast.success(`Job initiated successfully\nJob ID: ${result.jobId}`);
      setPollTrigger((prev) => prev + 1);
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
