import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import { getJobByMediaId, retryJob } from '@/app/(admin)/admin/movies/_action';
import { useJobStatus } from '@/hooks/use-job-status';

interface JobCreationResponse {
  jobId: string;
  error?: string;
}

export function useMovieJob(mediaId: string | null) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollTrigger, setPollTrigger] = useState(0);
  const { jobStatus: processingStatus, error: jobError } = useJobStatus(
    jobId,
    pollTrigger,
  );

  useEffect(() => {
    if (jobError) {
      toast.error('Job Status Error', { description: jobError });
    }
  }, [jobError]);

  useEffect(() => {
    async function fetchInitialJob() {
      if (mediaId) {
        const result = await getJobByMediaId(mediaId);
        if (result.success && result.job) {
          setJobId(result.job._id);
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
        setJobId(result.jobId);
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
    jobId,
    processingStatus,
    initiateJob,
    handleRetryJob,
  };
}
