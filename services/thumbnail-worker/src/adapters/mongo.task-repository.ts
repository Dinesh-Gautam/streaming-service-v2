import { Collection } from 'mongodb';
import { inject, injectable } from 'tsyringe';

import type {
  ITaskRepository,
  TaskStatus,
  ThumbnailOutput,
} from '@monorepo/core';
import type { IDatabaseConnection } from '@monorepo/database';

import { DI_TOKENS, MediaJob as Job } from '@monorepo/core';

@injectable()
export class MongoTaskRepository implements ITaskRepository {
  private readonly collection: Collection<Job>;

  constructor(
    @inject(DI_TOKENS.DatabaseConnection)
    private readonly dbConnection: IDatabaseConnection,
  ) {
    const db = this.dbConnection.getDb();
    this.collection = db.collection<Job>('jobs');
  }

  async findJobById(id: string): Promise<Job | null> {
    return this.collection.findOne({ _id: id as any });
  }

  async updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
  ): Promise<void> {
    const updateFields: any = {
      'tasks.$.status': status,
    };
    if (progress !== undefined) {
      updateFields['tasks.$.progress'] = progress;
    }
    await this.collection.updateOne(
      { _id: jobId as any, 'tasks.taskId': taskId },
      { $set: updateFields },
    );
  }

  async updateTaskOutput(
    jobId: string,
    taskId: string,
    output: ThumbnailOutput,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: jobId as any, 'tasks.taskId': taskId },
      { $set: { 'tasks.$.output': output } },
    );
  }

  async failTask(
    jobId: string,
    taskId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: jobId as any, 'tasks.taskId': taskId },
      {
        $set: {
          'tasks.$.status': 'failed',
          'tasks.$.errorMessage': errorMessage,
        },
      },
    );
  }
}
