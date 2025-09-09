import { injectable } from 'tsyringe';

import { ISourceResolver } from '@monorepo/core';

@injectable()
export class FsSourceResolver implements ISourceResolver {
  async resolveSource(source: string): Promise<string> {
    // For now, we'll assume the source is a local file path
    return Promise.resolve(source);
  }
}
