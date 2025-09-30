'use client';

import React from 'react';

import { Check, Copy } from 'lucide-react';

import type { MediaJob } from '@monorepo/core';

import { Button } from '@/admin/components/ui/button';
import SegmentedProgressBar from '@/app/(admin)/admin/movies/[id]/components/SegmentedProgressBar';
import { getPlaybackUrl } from '@/utils/url';

// import SegmentedProgressBar, {
//   SparkelIcon,
// } from './components/SegmentedProgressBar';

interface MediaProcessingSectionProps {
  originalPath: string | undefined;
  mediaId: string | undefined;
  processingStatus: MediaJob | null;
  onInitiateJob: (mediaId: string, filePath: string) => void;
  onRetryJob: (mediaId: string) => void;
  movieId: string;
}

export function MediaProcessingSection({
  originalPath,
  mediaId,
  processingStatus,
  onInitiateJob,
  onRetryJob,
  movieId,
}: MediaProcessingSectionProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(window.location.origin + text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div>
      {originalPath && mediaId && (
        <div className="flex flex-col space-y-4">
          <video
            className="self-center w-full max-w-3xl h-auto rounded-md"
            controls
            src={'/api/static/' + originalPath}
            key={originalPath}
          />

          {(!processingStatus ||
            processingStatus.status === 'pending' ||
            processingStatus.status === 'failed') && (
            <Button
              type="button"
              onClick={() =>
                processingStatus?.status === 'failed' ?
                  onRetryJob(mediaId)
                : onInitiateJob(mediaId, originalPath)
              }
              disabled={processingStatus?.status === 'processing'}
            >
              {processingStatus?.status === 'failed' ?
                'Retry Processing'
              : 'Start Processing'}
            </Button>
          )}

          {processingStatus && (
            <SegmentedProgressBar
              tasks={processingStatus.tasks}
              jobStatus={processingStatus.status}
            />
          )}

          {processingStatus?.status === 'completed' && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <div className="flex-1 text-sm truncate">
                {getPlaybackUrl(movieId) || ''}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getPlaybackUrl(movieId) || '')}
              >
                {isCopied ?
                  <Check className="h-4 w-4 mr-1" />
                : <Copy className="h-4 w-4 mr-1" />}
                {isCopied ? 'Copied' : 'Copy URL'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
