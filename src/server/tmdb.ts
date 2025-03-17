import { TMDBWebAPI } from 'tmdb-js-web';

import { createCachedMovieMethod } from './utils';

if (process.env.TMDB_API_KEY === undefined) {
  throw new Error('TMDB_API_KEY is not defined');
}

export const TmdbV3 = new TMDBWebAPI(process.env.TMDB_API_KEY).v3;

/**
 * Give the list of popular Movies
 */
export const getPopularMovies = createCachedMovieMethod(
  TmdbV3.movies.getPopular,
);

/**
 * Get trailer videos of movie
 */
export const getMovieVideos = createCachedMovieMethod(TmdbV3.movies.getVideos);

/**
 * Get the trailer videos of a TV series
 */
export const getTvVideos = createCachedMovieMethod(TmdbV3.tv.getVideos);
