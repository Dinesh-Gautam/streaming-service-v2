import { Collection, ObjectId } from 'mongodb';
import { inject, injectable } from 'tsyringe';

import type { IJobRepository, JobStatus } from '@monorepo/core';

import { DI_TOKENS, MediaJob, TaskStatus } from '@monorepo/core';
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

    if (!job) return null;

    const mediaPresenter = new MediaJob(
      job.mediaId,
      job.sourceUrl,
      job.status,
      job.tasks,
      job.outputUrl,
      job.createdAt,
      job.updatedAt,
      job.error,
    );

    mediaPresenter._id = job._id;
    return mediaPresenter;
  }

  async getJobByMediaId(mediaId: string): Promise<MediaJob | null> {
    const job = await this.collection.findOne({ mediaId });

    if (!job) return null;

    const mediaPresenter = new MediaJob(
      job.mediaId,
      job.sourceUrl,
      job.status,
      job.tasks,
      job.outputUrl,
      job.createdAt,
      job.updatedAt,
      job.error,
    );

    mediaPresenter._id = job._id;
    return mediaPresenter;
  }

  async updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { status } },
    );
  }
}
