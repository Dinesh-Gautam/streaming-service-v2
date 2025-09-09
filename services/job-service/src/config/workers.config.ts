import type { WorkerTypes } from '@monorepo/workers';

export const WORKERS: { name: string; type: WorkerTypes }[] = [
  {
    name: 'ThumbnailWorker',
    type: 'thumbnail' as const,
  },
  // Add other workers here
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
