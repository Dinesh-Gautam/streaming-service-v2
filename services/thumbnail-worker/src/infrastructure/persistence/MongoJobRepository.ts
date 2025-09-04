import { Collection, Db } from 'mongodb';
import { inject, injectable } from 'tsyringe';

import type { IDatabaseConnection } from '@monorepo/database';
import type { ThumbnailOutput } from '@thumbnail-worker/application/ports/IMediaProcessor';

import { BaseJob as Job } from '@monorepo/core';
import { MongoDbConnection } from '@monorepo/database';
import { IJobRepository } from '@thumbnail-worker/domain/repositories/IJobRepository';

@injectable()
export class MongoJobRepository implements IJobRepository {
  private readonly collection: Collection<Job>;

  constructor(
    @inject(MongoDbConnection)
    private readonly dbConnection: IDatabaseConnection,
  ) {
    const db = this.dbConnection.getDb();
    this.collection = db.collection<Job>('jobs');
  }

  async findById(id: string): Promise<Job | null> {
    return this.collection.findOne({ _id: id as any });
  }

  async updateTaskStatus(
    jobId: string,
    taskId: string,
    status: import('@monorepo/core').TaskStatus,
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
