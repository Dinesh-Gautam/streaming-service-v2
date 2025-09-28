import { MediaJob, MediaTask } from '@monorepo/core';
import { WorkerMessages, WorkerOutputs, WorkerTypes } from '@monorepo/workers';

type TaskMessages = WorkerMessages[keyof Omit<
  WorkerMessages,
  'task_completed' | 'task_failed'
>];

export class TaskPayloadFactory {
  static create(
    job: MediaJob,
    nextTask: MediaTask,
    previousTaskType: WorkerTypes,
    previousTaskOutput: WorkerOutputs[WorkerTypes],
  ): TaskMessages {
    const basePayload = {
      jobId: job._id.toString(),
      taskId: nextTask.taskId,
      sourceUrl: job.sourceUrl,
    };

    switch (nextTask.worker) {
      case 'transcode': {
        if (previousTaskType === 'ai') {
          const aiOutput = previousTaskOutput as WorkerOutputs['ai'];
          return {
            ...basePayload,
            payload: {
              dubbedAudioPaths: aiOutput.data.dubbedAudioPaths,
            },
          };
        }
        return basePayload;
      }
      case 'subtitle': {
        return {
          ...basePayload,
          payload: {
            sourceLanguage: 'en',
            targetLanguages: ['hi', 'pa'],
          },
        };
      }
      default:
        return basePayload;
    }
  }
}
