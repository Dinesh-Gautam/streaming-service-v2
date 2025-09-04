export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export class Task {
  constructor(
    public taskId: string,
    public engine: string,
    public status: TaskStatus = 'pending',
    public progress: number = 0,
    public errorMessage?: string,
    public startTime?: Date,
    public endTime?: Date,
    public output?: any,
  ) {}
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class BaseJob {
  public _id?: any;

  constructor(
    public mediaId: string,
    public sourceUrl: string,
    public status: JobStatus = 'pending',
    public tasks: Task[] = [],
    public outputUrl?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public error?: string,
  ) {}
}

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, entity: T): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
