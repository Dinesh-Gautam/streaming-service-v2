import type { WorkerOutput, WorkerOutputs } from '@monorepo/workers';

export const MediaPrcessorEvent = {
  Progress: 'progress',
  Completed: 'completed',
  Error: 'error',
} as const;

export interface IMediaProcessor<T extends WorkerOutputs[keyof WorkerOutputs]>
  extends NodeJS.EventEmitter {
  process(inputFile: string, outputDir: string): Promise<WorkerOutput<T>>;

  on(
    event: (typeof MediaPrcessorEvent)[keyof typeof MediaPrcessorEvent],
    listener: (progress: number) => void,
  ): this;
}
