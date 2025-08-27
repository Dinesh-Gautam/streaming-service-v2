'use server';

import { unstable_cache } from 'next/cache';

import { cachedTvSeasonInfo } from '@/server/tmdb';

import 'server-only';

const cachedGetTvSeasonInfor = unstable_cache(
  async (tvId: number, seasonNumber: number) =>
    await cachedTvSeasonInfo(tvId, seasonNumber),
  ['SEASON_INFO'],
  {
    revalidate: false,
  },
);

export async function getSeasonInfo(tvId: number, seasonNumber: number) {
  const info = await cachedGetTvSeasonInfor(tvId, seasonNumber);

  return info;
}
