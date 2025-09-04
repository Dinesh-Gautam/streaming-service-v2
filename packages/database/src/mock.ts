import type { IDatabaseConnection } from '.';

export class MockDatabaseConnection implements IDatabaseConnection {
  connect = jest.fn().mockResolvedValue(undefined);
  getDb = jest.fn().mockReturnValue(null);
  close = jest.fn().mockResolvedValue(undefined);
}
