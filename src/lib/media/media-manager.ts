import dbConnect from '@/server/db/connect'; // Ensure DB connection
import {
  IMediaProcessingJob,
  IMediaProcessingTask,
  MediaProcessingJob,
} from '@/server/db/schemas/media-processing';

import { MediaEngine } from './media-engine';

export class MediaManager {
  private engines: MediaEngine[];
  private mediaId: string;
  private job: IMediaProcessingJob | null = null;

  constructor(mediaId: string, engines: MediaEngine[]) {
    if (!mediaId) {
      throw new Error('MediaManager requires a valid mediaId.');
    }
    if (!engines || engines.length === 0) {
      throw new Error('MediaManager requires at least one MediaEngine.');
    }
    this.mediaId = mediaId;
    this.engines = engines;
  }

  /**
   * Runs the processing engines sequentially.
   * Creates or updates a MediaProcessingJob document to track progress.
   * @param inputFile - Path to the input file.
   * @param outputDir - Base directory for engine outputs.
   */
  public async run(inputFile: string, outputDir: string): Promise<void> {
    console.log(`[MediaManager] Starting job for mediaId: ${this.mediaId}`);
    await dbConnect(); // Ensure database is connected

    try {
      this.job = await this.findOrCreateJob();
      if (!this.job) {
        // Should not happen if findOrCreateJob is correct, but belts and suspenders
        throw new Error('Failed to create or find processing job.');
      }

      // Only start if the job isn't already completed or failed
      if (
        this.job.jobStatus === 'completed' ||
        this.job.jobStatus === 'failed'
      ) {
        console.log(
          `[MediaManager] Job for ${this.mediaId} already ${this.job.jobStatus}. Skipping run.`,
        );
        return;
      }

      await this.updateJobStatus('running');

      for (const engine of this.engines) {
        const task = this.findOrCreateTask(engine);
        if (!task) continue; // Should not happen

        // Skip if task already completed or failed in a previous run
        if (task.status === 'completed' || task.status === 'failed') {
          console.log(
            `[MediaManager] Task '${task.taskId}' already ${task.status}. Skipping.`,
          );
          if (task.status === 'failed') {
            // If any previous task failed, the whole job fails (sequential)
            await this.updateJobStatus('failed');
            console.error(
              `[MediaManager] Job failed because task '${task.taskId}' previously failed.`,
            );
            return; // Stop processing further engines
          }
          continue; // Move to the next engine if this one was completed
        }

        this.attachListeners(engine, task.taskId);

        try {
          console.log(
            `[MediaManager] Starting engine: ${engine.engineName} (Task ID: ${task.taskId})`,
          );
          await this.updateTask(task.taskId, {
            status: 'running',
            startTime: new Date(),
          });
          // Run the engine's process method
          await engine.process(inputFile, outputDir); // Pass relevant options if needed
          // Listener will handle 'completed' update
        } catch (error: any) {
          console.error(
            `[MediaManager] Engine ${engine.engineName} failed: ${error.message}`,
          );
          // Listener should have already updated task status to 'failed'
          await this.updateJobStatus('failed');
          // Stop processing further engines as per sequential requirement
          return;
        } finally {
          this.removeListeners(engine); // Clean up listeners
        }
      }

      // If all engines completed successfully
      await this.updateJobStatus('completed');
      console.log(
        `[MediaManager] Job for mediaId: ${this.mediaId} completed successfully.`,
      );
    } catch (error: any) {
      console.error(
        `[MediaManager] Critical error during job execution for ${this.mediaId}: ${error.message}`,
        error.stack,
      );
      // Ensure job status reflects failure if an unexpected error occurred
      if (this.job && this.job.jobStatus !== 'failed') {
        try {
          await this.updateJobStatus('failed');
        } catch (dbError) {
          console.error(
            `[MediaManager] Failed to update job status to failed after critical error: ${dbError}`,
          );
        }
      }
    }
  }

  private async findOrCreateJob(): Promise<IMediaProcessingJob | null> {
    let job = await MediaProcessingJob.findOne({ mediaId: this.mediaId });
    if (!job) {
      console.log(
        `[MediaManager] No existing job found for ${this.mediaId}. Creating new job.`,
      );
      const initialTasks = this.engines.map((engine, index) => ({
        taskId: `${engine.engineName.toLowerCase().replace('engine', '')}-${index}`, // e.g., thumbnail-0, transcoding-1
        engine: engine.engineName,
        status: 'pending',
        progress: 0,
      }));
      job = new MediaProcessingJob({
        mediaId: this.mediaId,
        jobStatus: 'pending',
        tasks: initialTasks,
      });
      await job.save();
      console.log(`[MediaManager] New job created with ID: ${job._id}`);
    } else {
      console.log(
        `[MediaManager] Found existing job for ${this.mediaId} with status: ${job.jobStatus}`,
      );
      // Ensure tasks exist for all current engines if job was created previously
      // with a different set of engines (though unlikely with current setup)
      this.engines.forEach((engine, index) => {
        this.findOrCreateTask(engine, job!); // Pass the fetched job
      });
      if (job.isModified()) {
        await job.save();
      }
    }
    return job;
  }

  // Helper to find or potentially add a task if the job exists but the task doesn't
  private findOrCreateTask(
    engine: MediaEngine,
    jobInstance?: IMediaProcessingJob,
  ): IMediaProcessingTask | undefined {
    const currentJob = jobInstance || this.job;
    if (!currentJob) return undefined;

    const index = this.engines.findIndex((e) => e === engine);
    const taskId = `${engine.engineName.toLowerCase().replace('engine', '')}-${index}`;

    let task = currentJob.tasks.find((t) => t.taskId === taskId);
    if (!task) {
      console.warn(
        `[MediaManager] Task ${taskId} not found in existing job ${currentJob._id}. Adding it.`,
      );
      const newTaskData = {
        taskId: taskId,
        engine: engine.engineName,
        status: 'pending',
        progress: 0,
      };
      currentJob.tasks.push(newTaskData as IMediaProcessingTask); // Add to array
      // Note: This modification needs saving, handled in findOrCreateJob or updateTask
      task = currentJob.tasks[currentJob.tasks.length - 1]; // Get the newly added task
    }
    return task;
  }

  private async updateJobStatus(status: IMediaProcessingJob['jobStatus']) {
    if (!this.job || !this.job._id) {
      console.error(
        '[MediaManager] Cannot update job status: job or job._id is missing.',
      );
      return;
    }
    // Use atomic update to prevent parallel save errors
    if (this.job.jobStatus !== status) {
      console.log(
        `[MediaManager] Atomically updating job status for ${this.job._id} to: ${status}`,
      );
      try {
        await MediaProcessingJob.updateOne(
          { _id: this.job._id },
          { $set: { jobStatus: status, updatedAt: new Date() } },
        );
        // Update local status cache if needed, though not strictly necessary if not read again
        this.job.jobStatus = status;
      } catch (error) {
        console.error(
          `[MediaManager] Failed to update job status for ${this.job._id}:`,
          error,
        );
      }
    }
  }

  private async updateTask(
    taskId: string,
    updates: Partial<Omit<IMediaProcessingTask, 'taskId' | 'engine'>>,
  ) {
    if (!this.job || !this.job._id) {
      console.error(
        '[MediaManager] Cannot update task: job or job._id is missing.',
      );
      return;
    }

    // Use atomic update with positional operator $ to update specific task in array
    const updateFields: Record<string, any> = {};
    let needsUpdate = false;

    // Construct the $set object for the fields to update
    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        // We need to check if the value actually changed compared to the local cache
        // to avoid unnecessary DB updates, though this check isn't strictly required
        // if we always want to push the update regardless.
        // For simplicity now, we'll just build the update object.
        updateFields[`tasks.$.${key}`] = updates[key as keyof typeof updates];
        needsUpdate = true;
      }
    }

    // Add endTime if status is completed or failed
    if (updates.status === 'completed' || updates.status === 'failed') {
      // Check if endTime already exists in the local cache to avoid overwriting
      const taskIndex = this.job.tasks.findIndex((t) => t.taskId === taskId);
      if (taskIndex !== -1 && !this.job.tasks[taskIndex].endTime) {
        updateFields['tasks.$.endTime'] = new Date();
        needsUpdate = true;
      } else if (taskIndex === -1) {
        // Task not found in local cache, assume we need to set endTime
        updateFields['tasks.$.endTime'] = new Date();
        needsUpdate = true;
      }
    }

    // Add updatedAt for the main job document
    if (needsUpdate) {
      updateFields['updatedAt'] = new Date();

      console.log(
        `[MediaManager] Atomically updating task ${taskId} for job ${this.job._id}: ${JSON.stringify(updates)}`,
      );

      try {
        const result = await MediaProcessingJob.updateOne(
          // Match the job and the specific task within the array
          { _id: this.job._id, 'tasks.taskId': taskId },
          { $set: updateFields },
        );

        if (result.matchedCount === 0) {
          console.warn(
            `[MediaManager] Update task: No document matched for job ${this.job._id} and task ${taskId}.`,
          );
        } else if (result.modifiedCount === 0) {
          // This might happen if the values being set are the same as existing ones
          // console.log(`[MediaManager] Update task: Document matched but not modified for task ${taskId}.`);
        }

        // Update local cache if needed (optional)
        const taskIndex = this.job.tasks.findIndex((t) => t.taskId === taskId);
        if (taskIndex !== -1) {
          Object.assign(this.job.tasks[taskIndex], updates);
          if (updateFields['tasks.$.endTime']) {
            this.job.tasks[taskIndex].endTime = updateFields['tasks.$.endTime'];
          }
        }
      } catch (error) {
        console.error(
          `[MediaManager] Failed to atomically update task ${taskId} for job ${this.job._id}:`,
          error,
        );
      }
    }
  }

  // --- Event Listener Management ---

  private listeners = new Map<string, Map<string, (...args: any[]) => void>>();

  // private _progressTimeOut: NodeJS.Timeout | null = null;

  private attachListeners(engine: MediaEngine, taskId: string): void {
    const engineListeners = new Map<string, (...args: any[]) => void>();

    const onProgress = (progress: number) => {
      // if (!this._progressTimeOut) {
      this.updateTask(taskId, { progress });

      // run the progress update after some time, to prevent huge number of db calls
      // this._progressTimeOut = setTimeout(() => {
      //   this._progressTimeOut = null;
      // }, 1000);
      // }
    };

    const onStatus = (status: IMediaProcessingTask['status']) => {
      // Status is updated directly via updateTask before/after engine.process
      // but we can log it here if needed.
      // console.log(`[MediaManager] Task ${taskId} status changed to ${status} via event.`);
    };
    const onError = (errorMessage: string) => {
      // Fetch current progress when error occurs, don't rely on closed-over 'task'
      const currentTaskProgress =
        this.job?.tasks.find((t) => t.taskId === taskId)?.progress ?? 0;
      this.updateTask(taskId, {
        status: 'failed',
        errorMessage,
        progress: currentTaskProgress,
      });
    };
    const onComplete = () => {
      this.updateTask(taskId, { status: 'completed', progress: 100 });
    };

    engine.on('progress', onProgress);
    engine.on('status', onStatus);
    engine.on('error', onError);
    engine.on('complete', onComplete);

    engineListeners.set('progress', onProgress);
    engineListeners.set('status', onStatus);
    engineListeners.set('error', onError);
    engineListeners.set('complete', onComplete);

    this.listeners.set(taskId, engineListeners);
  }

  private removeListeners(engine: MediaEngine): void {
    const index = this.engines.findIndex((e) => e === engine);
    const taskId = `${engine.engineName.toLowerCase().replace('engine', '')}-${index}`;
    const engineListeners = this.listeners.get(taskId);

    if (engineListeners) {
      engineListeners.forEach((listener, event) => {
        engine.off(event, listener);
      });
      this.listeners.delete(taskId);
    }
  }
}

// Helper function to safely get task progress (avoids errors if task not found)
export function getTaskProgress(
  job: IMediaProcessingJob | null | undefined,
  taskIdPrefix: string,
): { status: string; progress: number; error?: string } {
  const task = job?.tasks.find((t) => t.taskId.startsWith(taskIdPrefix));
  return {
    status: task?.status ?? 'pending',
    progress: task?.progress ?? 0,
    error: task?.errorMessage,
  };
}
