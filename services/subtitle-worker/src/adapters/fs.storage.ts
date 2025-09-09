import * as fs from 'fs';
import { injectable } from 'tsyringe';

import { IStorage } from '@monorepo/core';

@injectable()
export class FsStorage implements IStorage {
  async writeFile(path: string, content: string): Promise<void> {
    await fs.promises.writeFile(path, content);
  }
}
