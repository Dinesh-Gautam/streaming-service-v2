// Define worker types
export type WorkerTypes = 'thumbnail' | 'transcode';

// Define outputs
export interface ThumbnailOutput {
  paths: {
    vtt: string;
    thumbnailsDir: string;
  };
}

export interface TranscodingOutput {
  test: boolean;
}

// Map worker -> output type
export type WorkerOutputs = {
  thumbnail: ThumbnailOutput;
  transcode: TranscodingOutput;
};

// Base messages
export type TaskCompletedMessage<T extends WorkerTypes> = {
  jobId: string;
  taskId: string;
  taskType: T;
  output: WorkerOutputs[T];
};

export type TaskFailedMessage = {
  jobId: string;
  taskId: string;
};

// Worker messages by channel
export type WorkerMessages = {
  thumbnail_tasks: {
    jobId: string;
    taskId: string;
    sourceUrl: string;
  };
  transcode_tasks: {
    jobId: string;
    taskId: string;
    sourceUrl: string;
  };
  task_completed: TaskCompletedMessage<WorkerTypes>;
  task_failed: TaskFailedMessage;
};

// Generic worker output wrapper
export type WorkerOutput<T> = {
  success: boolean;
  output: T;
};
