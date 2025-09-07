import path from 'path';

import type { ISourceResolver } from '@thumbnail-worker/interfaces/source-resolver.interface';

export class FsSourceResolver implements ISourceResolver {
  async resolveSource(url: string): Promise<string> {
    const fsPath = path.resolve(url);
    return fsPath;
  }
}
