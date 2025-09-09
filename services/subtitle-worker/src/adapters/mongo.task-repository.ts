import { Collection, ObjectId } from 'mongodb';
import { inject, injectable } from 'tsyringe';

import {
  DI_TOKENS,
  ITaskRepository,
  MediaJob,
  TaskStatus,
} from '@monorepo/core';
import { IDatabaseConnection } from '@monorepo/database';
import { SubtitleResult } from '@subtitle-worker/domain/subtitle-result.entity';

@injectable()
export class MongoTaskRepository implements ITaskRepository {
  private readonly collection: Collection<MediaJob>;

  constructor(
    @inject(DI_TOKENS.DatabaseConnection)
    private readonly dbConnection: IDatabaseConnection,
  ) {
    const db = this.dbConnection.getDb();
    this.collection = db.collection<MediaJob>('jobs');
  }

  async findJobById(id: string): Promise<MediaJob | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
  ): Promise<void> {
    const updateFields: any = {
      'tasks.$[task].status': status,
    };
    if (progress !== undefined) {
      updateFields['tasks.$[task].progress'] = progress;
    }
    await this.collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: updateFields },
      { arrayFilters: [{ 'task.taskId': taskId }] },
    );
  }

  async updateTaskOutput(
    jobId: string,
    taskId: string,
    output: SubtitleResult,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { 'tasks.$[task].output': output } },
      { arrayFilters: [{ 'task.taskId': taskId }] },
    );
  }

  async failTask(
    jobId: string,
    taskId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          'tasks.$[task].status': 'failed',
          'tasks.$[task].errorMessage': errorMessage,
        },
      },
      {
        arrayFilters: [{ 'task.taskId': taskId }],
      },
    );
  }
}
