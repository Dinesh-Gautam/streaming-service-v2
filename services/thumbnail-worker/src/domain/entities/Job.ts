export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  mediaId: string;
  status: JobStatus;
  sourceUrl: string;
  outputUrl?: string;
  error?: string;
}
