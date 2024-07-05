'use server';

import 'server-only';

import { type MediaType } from '@/lib/types';
import { getMovieVideos, getTvVideos } from '@/server/tmdb';

export async function getVideos(videoId: number, type: MediaType) {
  console.log('getting videos for', videoId, type);
  const data = await getVideosData(videoId, type);

  if (!data) return;

  return data.results
    .filter((video) => video.official && video.type === 'Trailer')
    .sort((a, b) => {
      return (
        new Date(a.published_at).getMilliseconds() -
        new Date(b.published_at).getMilliseconds()
      );
    });
}

function getVideosData(videoId: number, type: MediaType) {
  if (type === 'movie') {
    return getMovieVideos(videoId);
  }
  if (type === 'tv') {
    return getTvVideos(videoId);
  }
}
