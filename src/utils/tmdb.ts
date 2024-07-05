const TMDB_IMAGE_URL = 'https://image.tmdb.org';

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
