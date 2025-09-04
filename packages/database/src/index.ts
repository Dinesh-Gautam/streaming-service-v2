import { Db, MongoClient } from 'mongodb';
import { singleton } from 'tsyringe';

@singleton()
export class MongoDbConnection {
  private db: Db | null = null;
  private client: MongoClient | null = null;

  public async connect(mongoUri?: string): Promise<void> {
    if (this.db) {
      return;
    }

    if (!mongoUri) {
      throw new Error('MongoDB URI is not provided.');
    }

    const uri = mongoUri || 'mongodb://localhost:27017';
    this.client = new MongoClient(uri);

    try {
      await this.client.connect();
      this.db = this.client.db();
      console.log('Successfully connected to MongoDB.');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.db = null;
      this.client = null;
      console.log('MongoDB connection closed.');
    }
  }
}
