import type { MoviesGetPopularResult } from 'tmdb-js-web';

import { TMDB_IMAGE_URL } from '@/constants/config';

/**
 * Gives the `TMDB` image url for the given image path
 * @param path
 * @param options
 * @returns
 */
export function getImageUrl(path: string, options?: { size: number }) {
  if (path === '') return '';
  return `${TMDB_IMAGE_URL}/t/p/${
    options?.size ? 'w' + options?.size : 'original'
  }${path}`;
}

/**
 * Omit the results that don't have a banner image
 * @param results
 * @returns results with banner image
 */
export function omitResutlsWithNoBannerImage(
  results: MoviesGetPopularResult[],
) {
  return results.filter((result) => result.backdrop_path);
}
