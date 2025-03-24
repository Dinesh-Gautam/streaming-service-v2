import { cache } from 'react';

export const createCachedFunction = <
  T extends (...args: any[]) => Promise<any>,
>(
  method: T,
) => {
  return cache(async (...params: Parameters<T>): Promise<ReturnType<T>> => {
    return await method(...params);
  });
};
