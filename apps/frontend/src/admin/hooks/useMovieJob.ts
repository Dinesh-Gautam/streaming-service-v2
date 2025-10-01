import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import { useJobStatus } from '@/admin/hooks/use-job-status';
import { getJobByMediaId, retryJob } from '@/app/(admin)/admin/movies/_action';

interface JobCreationResponse {
  jobId: string;
  error?: string;
}

export function useMovieJobProcessing(mediaId: string | null) {
  const [pollTrigger, setPollTrigger] = useState(0);
  const { jobStatus: processingStatus, error: jobError } = useJobStatus(
    mediaId,
    pollTrigger,
  );

  useEffect(() => {
    if (jobError) {
      toast.error('Job Status Error', { description: jobError });
    }
  }, [jobError]);

  useEffect(() => {
    async function fetchInitialJob() {
      if (mediaId) await getJobByMediaId(mediaId);
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
    const result = await retryJob(mediaId);
    if (result.success) {
      toast.success(result.message);
      setPollTrigger((prev) => prev + 1); // Trigger polling again
    } else {
      toast.error(result.message);
    }
  }, []);

  return {
    processingStatus,
    initiateJob,
    handleRetryJob,
  };
}
