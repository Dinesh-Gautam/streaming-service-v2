import type { IStorage } from '@monorepo/core';

import { LocalStorage } from '@monorepo/core';

export const getStorage = (): IStorage => {
  // In the future, we can use env variables to decide which storage to use.
  // For now, we only have LocalStorage.
  // if (process.env.STORAGE_PROVIDER === 's3') {
  //   return new S3Storage();
  // }

  return new LocalStorage();
};
