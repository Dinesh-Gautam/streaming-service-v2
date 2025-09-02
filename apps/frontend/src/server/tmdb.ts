import { unstable_cache } from 'next/cache';

import { TMDBWebAPI } from 'tmdb-js-web';

import { createCachedFunction } from './utils';

if (process.env.NEXT_PUBLIC_TMDB_API_KEY === undefined) {
  throw new Error('TMDB_API_KEY is not defined');
}

export const TmdbV3 = new TMDBWebAPI({
  apiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY
}).v3;

/**
 * Give the list of popular Movies
 */
export const cachedGetPopularMovies = createCachedFunction(
  TmdbV3.movies.getPopular,
);

/**
 * Get the list of now playing movies
 */
export const cachedGetNowPlayingMovies = createCachedFunction(
  TmdbV3.movies.getNowPlaying,
);

/**
 * Get the list of trending movies or tv series
 */
export const cachedGetTrending = createCachedFunction(
  TmdbV3.trending.getTrending,
);

/**
 * Get videos of movie
 */
export const cachedGetMoviesVideos = createCachedFunction(
  TmdbV3.movies.getVideos,
);

/**
 * Get the videos of a TV series
 */
export const cachedGetTvVideos = createCachedFunction(TmdbV3.tv.getVideos);

export const cachedMultiSearch = createCachedFunction(
  TmdbV3.search.searchMulti,
);

export const cachedGeMovietDetails = createCachedFunction(
  TmdbV3.movies.getDetails,
);

export const cachedTvDetails = createCachedFunction(TmdbV3.tv.getDetails);

export const cachedTvSeasonInfo = createCachedFunction(
  TmdbV3.tvSeasons.getDetails,
);

export const cachedGetGenere = unstable_cache(
  createCachedFunction(async () => {
    const combinedPromises = await Promise.all([
      TmdbV3.genres.getMovieList(),

      TmdbV3.genres.getTVList(),
    ]);

    const [movieGene, tvGene] = combinedPromises;

    return [...movieGene.genres, ...tvGene.genres];
  }),
  ['GENERES'],
  { revalidate: false },
);
