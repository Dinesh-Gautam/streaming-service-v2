'use client';

import type { MediaJob } from '@monorepo/core';

import { Badge } from '@/admin/components/ui/badge';

interface MediaProcessingStatusProps {
  job: MediaJob | null;
}

export function MediaProcessingStatus({ job }: MediaProcessingStatusProps) {
  if (!job) {
    return (
      <Badge
        variant="outline"
        className="bg-muted/50 capitalize"
      >
        Not Started
      </Badge>
    );
  }

  if (job.status === 'completed') {
    return (
      <Badge
        variant="outline"
        className="bg-green-300/10 text-green-300 border-green-300/20"
      >
        Complete
      </Badge>
    );
  }

  if (job.status === 'failed') {
    return (
      <Badge
        variant="outline"
        className="bg-red-300/10 text-red-400 border-red-300/20"
      >
        Failed
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-muted/50 capitalize"
    >
      {job.status}
    </Badge>
  );
}
