import { Collection, Db, MongoClient } from 'mongodb';
import { injectable } from 'tsyringe';

import { Job } from '@thumbnail-worker/domain/entities/Job';
import { IJobRepository } from '@thumbnail-worker/domain/repositories/IJobRepository';
import { logger } from '@thumbnail-worker/infrastructure/logger';

@injectable()
export class MongoJobRepository implements IJobRepository {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<Job> | null = null;

  async connect(url: string, dbName: string): Promise<void> {
    try {
      this.client = new MongoClient(url);
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.collection = this.db.collection<Job>('jobs');
      logger.info('Connected to MongoDB');
    } catch (error) {
      logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  async findById(id: string): Promise<Job | null> {
    if (!this.collection) {
      throw new Error('MongoDB collection is not available');
    }
    return this.collection.findOne({ id });
  }

  async update(job: Job): Promise<void> {
    if (!this.collection) {
      throw new Error('MongoDB collection is not available');
    }
    await this.collection.updateOne(
      { id: job.id },
      { $set: job },
      { upsert: true },
    );
  }

  async close(): Promise<void> {
    await this.client?.close();
    logger.info('MongoDB connection closed');
  }
}
