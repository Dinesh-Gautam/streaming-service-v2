'use server';

import 'server-only';

import { unstable_cache } from 'next/cache';

import { type MediaType } from '@/lib/types';
import { cachedGetMoviesVideos, cachedGetTvVideos } from '@/server/tmdb';

/**
 * Gets the cahched videos of a particular media
 * @private
 */
const cachedGetVideoData = unstable_cache(
  async (videoId: number, type: MediaType) =>
    await _getVideosData(videoId, type),
  ['VIDEO_DATA'],
  {
    revalidate: 60 * 60 * 24, // 1 day
  },
);

/**
 * Get the `movie/tv` trailer videos
 */
export async function getTitleTrailerVideos(videoId: number, type: MediaType) {
  const data = await cachedGetVideoData(videoId, type);

  if (!data) throw new Error('No videos found');

  return data.results
    .filter((video) => video.official && video.type === 'Trailer')
    .sort((a, b) => {
      return (
        new Date(a.published_at).getMilliseconds() -
        new Date(b.published_at).getMilliseconds()
      );
    });
}

function _getVideosData(videoId: number, type: MediaType) {
  if (type === 'movie') {
    return cachedGetMoviesVideos(videoId);
  }
  if (type === 'tv') {
    return cachedGetTvVideos(videoId);
  }
}
