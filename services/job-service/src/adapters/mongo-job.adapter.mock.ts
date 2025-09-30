import type { IJobRepository } from '@monorepo/core';

export class MockMongoJobAdapter implements IJobRepository {
  create = jest.fn();
  save = jest.fn();
  getJobById = jest.fn();
  getJobByMediaId = jest.fn();
  updateJobStatus = jest.fn();
  findByStatus = jest.fn();
}
