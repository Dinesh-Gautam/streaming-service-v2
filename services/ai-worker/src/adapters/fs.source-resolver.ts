import path from 'path';
import { injectable } from 'tsyringe';

import { ISourceResolver } from '@monorepo/core';

@injectable()
export class FsSourceResolver implements ISourceResolver {
  async resolveSource(url: string): Promise<string> {
    // The URL from the job is relative to the project root.
    // We need to make it an absolute path inside the container's file system.
    const containerPath = path.resolve(
      process.cwd(),
      url.startsWith('/') ? url.substring(1) : url,
    );
    return containerPath;
  }
}
