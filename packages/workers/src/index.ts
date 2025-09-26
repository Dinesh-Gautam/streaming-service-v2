// Define worker types
export type WorkerTypes = 'thumbnail' | 'transcode' | 'subtitle' | 'ai';

// Define outputs
export interface ThumbnailOutput {
  paths: {
    vtt: string;
    thumbnailsDir: string;
  };
}

export interface TranscodingOutput {
  manifest: string;
  dubbedLanguages: string[];
  dubbedAudioTracks: string[];
}

export interface SubtitleOutput {
  vttPaths: Record<string, string>; // { 'en': 'path/to/en.vtt', 'hi': 'path/to/hi.vtt' }
  transcriptionData?: any; // Raw transcription for debugging/future use
  translationErrors?: Record<string, string>;
}

export type AIEngineOutput = {
  data: {
    title?: string;
    description?: string;
    genres?: string[];
    chapters?: {
      vttPath: string;
    };
    subtitles?: {
      vttPaths: Record<string, string>;
    };
    posterImagePath?: string;
    backdropImagePath?: string;
    subtitleErrors?: Record<string, string>;
    dubbedAudioPaths?: Record<string, string>;
    audioProcessingErrors?: Record<string, string>;
  };
};

// Map worker -> output type
export type WorkerOutputs = {
  thumbnail: ThumbnailOutput;
  transcode: TranscodingOutput;
  subtitle: SubtitleOutput;
  ai: AIEngineOutput;
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
    payload?: { dubbedAudioPaths?: Record<string, string> };
  };
  subtitle_tasks: {
    jobId: string;
    taskId: string;
    sourceUrl: string;
    payload?: {
      sourceLanguage: string;
      targetLanguages: string[];
    };
  };
  task_completed: TaskCompletedMessage<WorkerTypes>;
  task_failed: TaskFailedMessage;
  ai_tasks: {
    jobId: string;
    taskId: string;
    sourceUrl: string;
  };
};

// Generic worker output wrapper
export type WorkerOutput<T> = {
  success: boolean;
  output: T;
};
