'use server';

import { cachedMultiSearch } from '@/server/tmdb';

import 'server-only';

export async function searchSuggest(
  query: string,
  options?: Omit<Parameters<typeof cachedMultiSearch>[0], 'query'>,
) {
  const { results } = await cachedMultiSearch({
    query: query,
    ...(options ?? {}),
  });

  return results;
}
