import { EventEmitter } from 'events';

export type MediaEngineStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface MediaEngineProgressDetail {
  percent: number;
  // Add any other relevant details like ETA, current step, etc. if needed
}

export abstract class MediaEngine extends EventEmitter {
  protected _status: MediaEngineStatus = 'pending';
  protected _progress: number = 0;
  protected _errorMessage: string | null = null;
  readonly engineName: string; // To identify the engine type

  constructor(name: string) {
    super();
    this.engineName = name;
  }

  /**
   * Starts the media processing task.
   * @param inputFile - The path to the input media file.
   * @param outputDir - The directory where output files should be saved.
   * @param options - Optional engine-specific configuration.
   */
  abstract process(
    inputFile: string,
    outputDir: string,
    options?: any,
  ): Promise<void>;

  /**
   * Gets the current status of the engine.
   */
  public getStatus(): MediaEngineStatus {
    return this._status;
  }

  /**
   * Gets the current progress percentage (0-100).
   */
  public getProgress(): number {
    return this._progress;
  }

  /**
   * Gets the error message if the engine failed.
   */
  public getErrorMessage(): string | null {
    return this._errorMessage;
  }

  /**
   * Updates the engine's status and emits a 'status' event.
   * @param status - The new status.
   */
  protected updateStatus(status: MediaEngineStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.emit('status', status);
      console.log(`[${this.engineName}] Status updated: ${status}`); // Basic logging
    }
  }

  /**
   * Updates the engine's progress and emits a 'progress' event.
   * @param progressDetail - An object containing the progress percentage and potentially other details.
   */
  protected updateProgress(progressDetail: MediaEngineProgressDetail): void {
    const newProgress = Math.max(0, Math.min(100, progressDetail.percent));
    if (this._progress !== newProgress) {
      this._progress = newProgress;
      this.emit('progress', this._progress, progressDetail); // Emit percentage and full detail
      // Avoid logging every single percentage update for performance
      // console.log(`[${this.engineName}] Progress updated: ${newProgress.toFixed(1)}%`);
    }
  }

  /**
   * Sets the error state, updates status, and emits an 'error' event.
   * @param error - The error object or message.
   */
  protected fail(error: Error | string): void {
    this._errorMessage = error instanceof Error ? error.message : error;
    this.updateStatus('failed');
    this.emit('error', this._errorMessage);
    console.error(`[${this.engineName}] Failed: ${this._errorMessage}`); // Basic logging
  }

  /**
   * Sets the completed state, ensures progress is 100%, and emits a 'complete' event.
   */
  protected complete(): void {
    this._progress = 100;
    this.updateStatus('completed');
    this.emit('complete');
    console.log(`[${this.engineName}] Completed successfully.`); // Basic logging
  }
}
