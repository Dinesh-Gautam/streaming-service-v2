import { Collection, ObjectId } from 'mongodb';
import { inject, injectable } from 'tsyringe';

import type { IJobRepository } from '@monorepo/core';

import { DI_TOKENS } from '@job-service/config';
import { MediaJob, TaskStatus } from '@monorepo/core';
import { IDatabaseConnection } from '@monorepo/database';

@injectable()
export class MongoJobRepository implements IJobRepository {
  private collection: Collection<MediaJob>;

  constructor(
    @inject(DI_TOKENS.DatabaseConnection)
    private dbConnection: IDatabaseConnection,
  ) {
    const db = this.dbConnection.getDb();
    this.collection = db.collection<MediaJob>('jobs');
  }

  async save(job: MediaJob): Promise<MediaJob> {
    const { _id, ...jobData } = job;
    if (_id) {
      await this.collection.updateOne(
        { _id: _id },
        { $set: jobData },
        { upsert: true },
      );
      return job;
    } else {
      const result = await this.collection.insertOne(job);
      job._id = result.insertedId;
      return job;
    }
  }

  async getJobById(id: string): Promise<MediaJob | null> {
    const job = await this.collection.findOne({ _id: new ObjectId(id) });
    return job ?
        new MediaJob(
          job.mediaId,
          job.sourceUrl,
          job.status,
          job.tasks,
          job.outputUrl,
          job.createdAt,
          job.updatedAt,
          job.error,
        )
      : null;
  }

  async getJobByMediaId(mediaId: string): Promise<MediaJob | null> {
    const job = await this.collection.findOne({ mediaId });
    return job ?
        new MediaJob(
          job.mediaId,
          job.sourceUrl,
          job.status,
          job.tasks,
          job.outputUrl,
          job.createdAt,
          job.updatedAt,
          job.error,
        )
      : null;
  }

  async updateTaskStatus(
    jobId: string,
    taskId: string,
    status: TaskStatus,
    progress?: number,
    errorMessage?: string,
  ): Promise<void> {
    const updateFields: any = {
      'tasks.$.status': status,
    };
    if (progress !== undefined) {
      updateFields['tasks.$.progress'] = progress;
    }
    if (errorMessage !== undefined) {
      updateFields['tasks.$.errorMessage'] = errorMessage;
    }

    await this.collection.updateOne(
      { _id: new ObjectId(jobId), 'tasks.taskId': taskId },
      { $set: updateFields },
    );
  }
}
