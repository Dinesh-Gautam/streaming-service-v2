import dbConnect from '@/server/db/connect'; // Ensure DB connection
import {
  IMediaProcessingJob,
  IMediaProcessingTask,
  MediaProcessingJob,
} from '@/server/db/schemas/media-processing';

import { EngineTaskOutput, SubtitleOutput } from './engine-outputs';
// Import the output union type
import { EngineOutput, MediaEngine } from './media-engine'; // Import generic types

export class MediaManager {
  // Use the base MediaEngine type here, as the array can hold engines with different output types
  private engines: MediaEngine<any>[]; // Using 'any' here is acceptable for the collection
  private mediaId: string;
  private job: IMediaProcessingJob | null = null;

  constructor(mediaId: string, engines: MediaEngine<any>[]) {
    if (!mediaId) {
      throw new Error('MediaManager requires a valid mediaId.');
    }
    if (!engines || engines.length === 0) {
      throw new Error('MediaManager requires at least one MediaEngine.');
    }
    this.mediaId = mediaId;
    this.engines = engines;

    // Ensure proper engine ordering for dependencies
    this._reorderEnginesForDependencies();
  }

  /**
   * Ensure engines run in the correct order based on dependencies
   * - SubtitleEngine should run before AIEngine (existing logic)
   * - AIEngine should run before TranscodingEngine (new logic)
   */
  private _reorderEnginesForDependencies(): void {
    // First check: AIEngine must run after SubtitleEngine
    const subtitleIndex = this.engines.findIndex(
      (e) => e.engineName === 'SubtitleEngine',
    );
    const aiIndex = this.engines.findIndex((e) => e.engineName === 'AIEngine');

    if (subtitleIndex !== -1 && aiIndex !== -1 && aiIndex < subtitleIndex) {
      console.warn(
        '[MediaManager] Warning: AIEngine found before SubtitleEngine. Reordering for dependency.',
      );
      // Move AIEngine after SubtitleEngine
      const aiEngineInstance = this.engines.splice(aiIndex, 1)[0];
      const newSubtitleIndex = this.engines.findIndex(
        (e) => e.engineName === 'SubtitleEngine',
      );
      this.engines.splice(newSubtitleIndex + 1, 0, aiEngineInstance);
    }

    // Second check: TranscodingEngine must run after AIEngine
    const transcodingIndex = this.engines.findIndex(
      (e) => e.engineName === 'TranscodingEngine',
    );
    const updatedAiIndex = this.engines.findIndex(
      (e) => e.engineName === 'AIEngine',
    );

    if (
      transcodingIndex !== -1 &&
      updatedAiIndex !== -1 &&
      transcodingIndex < updatedAiIndex
    ) {
      console.warn(
        '[MediaManager] Warning: TranscodingEngine found before AIEngine. Reordering for dependency.',
      );
      // Move TranscodingEngine after AIEngine
      const transcodingEngineInstance = this.engines.splice(
        transcodingIndex,
        1,
      )[0];
      const finalAiIndex = this.engines.findIndex(
        (e) => e.engineName === 'AIEngine',
      );
      this.engines.splice(finalAiIndex + 1, 0, transcodingEngineInstance);
    }

    console.log(
      '[MediaManager] Engines ordered:',
      this.engines.map((e) => e.engineName),
    );
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

      // --- START RETRY LOGIC ---
      let needsSave = false;
      if (this.job.jobStatus === 'failed') {
        console.log(`[MediaManager] Retrying failed job for ${this.mediaId}.`);
        this.job.jobStatus = 'pending'; // Reset job status before starting run
        this.job.tasks.forEach((task) => {
          if (task.status === 'failed') {
            console.log(
              `[MediaManager] Resetting failed task ${task.taskId} to pending for retry.`,
            );
            task.status = 'pending';
            task.errorMessage = undefined; // Clear previous error
            task.progress = 0; // Reset progress
            task.startTime = undefined;
            task.endTime = undefined;
          }
        });
        needsSave = true; // Mark that the job document needs saving
      }
      // --- END RETRY LOGIC ---

      // Check if job is already completed (no need to retry completed jobs)
      if (this.job.jobStatus === 'completed') {
        console.log(
          `[MediaManager] Job for ${this.mediaId} already completed. Skipping run.`,
        );
        return;
      }

      // Save the job if statuses were reset for retry
      if (needsSave) {
        // Use atomic update to save reset statuses
        const updateFields: Record<string, any> = {
          jobStatus: this.job.jobStatus,
          tasks: this.job.tasks, // Send the whole modified tasks array
          updatedAt: new Date(),
        };
        await MediaProcessingJob.updateOne(
          { _id: this.job._id },
          { $set: updateFields },
        );
        console.log(
          `[MediaManager] Job status and tasks reset for retry and saved.`,
        );
      }

      await this.updateJobStatus('running');

      // Store outputs from completed engines to pass to dependents
      const completedEngineOutputs: Record<string, EngineTaskOutput> = {};

      for (const engine of this.engines) {
        const task = this.findOrCreateTask(engine);
        if (!task) continue; // Should not happen

        let dependentInput: SubtitleOutput | undefined = undefined;
        // Prepare options for engine.process (might be populated based on dependencies)
        let processOptions: any = {};

        // --- Dependency Check: Specific logic for AIEngine ---
        if (engine.engineName === 'AIEngine') {
          dependentInput = completedEngineOutputs['SubtitleEngine'] as
            | SubtitleOutput
            | undefined;

          // If not in memory (e.g., during retry), check the DB
          if (!dependentInput) {
            const subtitleTask = this.findCompletedTaskInJob('SubtitleEngine');
            if (subtitleTask?.output) {
              console.log(
                `[MediaManager] Found SubtitleEngine output in DB for retry.`,
              );
              dependentInput = subtitleTask.output as SubtitleOutput; // Retrieve from DB
            } else {
              console.warn(
                `[MediaManager] SubtitleEngine output not found in memory or DB.`,
              );
            }
          }

          // If still no input after checking memory and DB, fail the dependency
          if (!dependentInput) {
            console.warn(
              `[MediaManager] Skipping AIEngine for ${this.mediaId} because SubtitleEngine did not complete successfully or its output is missing.`,
            );
            // Optionally, mark the AI task as skipped or failed due to dependency
            await this.updateTask(task.taskId, {
              status: 'failed', // Or a new 'skipped' status if desired
              errorMessage:
                'Dependency failed: SubtitleEngine output unavailable.',
            });
            continue; // Skip processing this engine
          }

          // Set processOptions for AIEngine
          processOptions = { subtitleOutput: dependentInput };
        }
        // --- End Dependency Check for AIEngine ---

        // --- Dependency Check: Specific logic for TranscodingEngine ---
        if (engine.engineName === 'TranscodingEngine') {
          // Check if we have AIEngine output to pass to TranscodingEngine
          const aiOutput = completedEngineOutputs['AIEngine'];

          if (
            !aiOutput &&
            this.engines.some((e) => e.engineName === 'AIEngine')
          ) {
            // AIEngine is configured but output is not in memory, check DB
            const aiTask = this.findCompletedTaskInJob('AIEngine');
            if (aiTask?.output) {
              console.log(
                `[MediaManager] Found AIEngine output in DB for TranscodingEngine.`,
              );
              // Include it in processOptions
              processOptions = {
                aiOutput: aiTask.output,
              };
            } else {
              console.log(
                `[MediaManager] No AIEngine output found for TranscodingEngine, but will proceed anyway.`,
              );
              // TranscodingEngine can still proceed without AI output
            }
          } else if (aiOutput) {
            // AI output is in memory, use it
            processOptions = {
              aiOutput,
            };
            console.log(
              `[MediaManager] Passing AIEngine output to TranscodingEngine.`,
            );
          }
        }
        // --- End Dependency Check for TranscodingEngine ---

        // Skip only if task already completed successfully in a previous run
        if (task.status === 'completed') {
          console.log(
            `[MediaManager] Task '${task.taskId}' already completed. Skipping.`,
          );
          continue; // Move to the next engine
        }
        // Tasks with 'pending' or 'failed' (after reset) status will proceed.

        this.attachListeners(engine, task.taskId);

        // No longer need try/catch specifically around engine.process,
        // as failure is indicated by the EngineOutput return value.
        // Keep the outer try/catch for broader job errors.

        console.log(
          `[MediaManager] Starting engine: ${engine.engineName} (Task ID: ${task.taskId}) - Status: ${task.status}`,
        );
        await this.updateTask(task.taskId, {
          status: 'running',
          startTime: new Date(),
          // Reset error message in DB if retrying a failed task
          ...(task.status === 'pending' &&
            task.errorMessage && { errorMessage: undefined }),
        });

        // Run the engine's process method and get the result
        const result: EngineOutput<EngineTaskOutput> = await engine.process(
          inputFile,
          outputDir,
          processOptions, // Pass the prepared options
        );

        // Check the result for success or failure
        if (!result.success) {
          console.error(
            `[MediaManager] Engine ${engine.engineName} reported failure: ${result.error}`,
          );
          // Listener should update task status to 'failed' via engine.fail()
          // Update overall job status to failed
          await this.updateJobStatus('failed');
          this.removeListeners(engine);
          return; // Stop processing further engines on failure
        } else {
          // Engine completed successfully. Update task status and store output.
          console.log(
            `[MediaManager] Engine ${engine.engineName} completed successfully. Output keys: ${result.output ? Object.keys(result.output) : 'N/A'}`,
          );

          // Store output for potential dependent tasks
          if (result.output) {
            completedEngineOutputs[engine.engineName] = result.output;
          }

          await this.updateTask(task.taskId, {
            status: 'completed',
            progress: 100,
            // Pass the entire output object (which now contains paths and data)
            output: result.output,
          });
          // The 'complete' event listener (onComplete) no longer needs to update the task status.
        }

        // Clean up listeners after successful completion of this engine
        this.removeListeners(engine);
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
    engine: MediaEngine<any>, // Accept any engine type
    jobInstance?: IMediaProcessingJob,
  ): IMediaProcessingTask | undefined {
    const currentJob = jobInstance || this.job;
    if (!currentJob) return undefined;

    const index = this.engines.findIndex(
      (e) => e.engineName === engine.engineName,
    );
    // Handle case where engine might not be found (shouldn't happen in normal flow)
    if (index === -1) {
      console.error(
        `[MediaManager] Engine ${engine.engineName} not found in configured engines during findOrCreateTask.`,
      );
      return undefined;
    }

    // Ensure taskId is consistently generated based on engine name and its *current* index
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

  private attachListeners(engine: MediaEngine<any>, taskId: string): void {
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
      // Task status and output are now updated directly after engine.process succeeds.
      // this.updateTask(taskId, { status: 'completed', progress: 100 }); // No longer needed here
      console.log(
        `[MediaManager] Received 'complete' event for task ${taskId}.`,
      );
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

  private removeListeners(engine: MediaEngine<any>): void {
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

  // Helper to find a completed task by engine name in the current job
  private findCompletedTaskInJob(
    engineName: string,
  ): IMediaProcessingTask | undefined {
    if (!this.job) return undefined;

    // Find the engine's index to construct the potential taskId
    const engineIndex = this.engines.findIndex(
      (e) => e.engineName === engineName,
    );
    if (engineIndex === -1) return undefined; // Engine not configured

    const taskId = `${engineName.toLowerCase().replace('engine', '')}-${engineIndex}`;

    return this.job.tasks.find(
      (task) => task.taskId === taskId && task.status === 'completed',
    );
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
