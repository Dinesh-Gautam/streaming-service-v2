import type { WorkerTypes } from '@monorepo/workers';

export const WORKERS: { name: string; type: WorkerTypes }[] = [
  {
    name: 'ThumbnailWorker',
    type: 'thumbnail',
  },
  // {
  //   name: 'SubtitleWorker',
  //   type: 'subtitle',
  // },
  // {
  //   name: 'AIWorker',
  //   type: 'ai',
  // },
  {
    name: 'TranscodingWorker',
    type: 'transcode',
  },
];

export const getNextTask = (
  currentTaskType: WorkerTypes,
): { name: string; type: WorkerTypes } | null => {
  const currentIndex = WORKERS.findIndex((w) => w.type === currentTaskType);
  if (currentIndex === -1 || currentIndex === WORKERS.length - 1) {
    return null;
  }
  return WORKERS[currentIndex + 1];
};
