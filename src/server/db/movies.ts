import type {
  MoviesGetDetailsGenre,
  MoviesGetPopularResult,
} from 'tmdb-js-web';

import type { Movie as MovieType } from '@/app/(admin)/admin/movies/movies-table';
import type { MediaType } from '@/lib/types';
import dbConnect from '@/server/db/connect';
import { Movie } from '@/server/db/schemas/movie';

await dbConnect();

export type OriginalMovieResult = Omit<
  Partial<MoviesGetPopularResult>,
  'id'
> & {
  id: string;
  isOriginal: boolean;
  genres: MoviesGetDetailsGenre[];
  media_type: MediaType;
};

export async function getOriginalMovies(): Promise<OriginalMovieResult[]> {
  const movies = await Movie.find({}).sort({ createdAt: -1 }).limit(20);

  return movies.map((movie: any) => {
    const { _id, ...plainMovie } = movie.toObject() as MovieType & {
      _id: string;
    };

    return {
      title: plainMovie.title,
      overview: plainMovie.description,
      release_date: new Date(plainMovie.year + '-01-01').toISOString(),
      genres: plainMovie.genres.map((g, i) => ({ id: i, name: g })),
      backdrop_path: plainMovie.media?.backdrop?.originalPath,
      isOriginal: true,
      id: _id.toString(),
      media_type: 'movie',
    };
  });
}

export async function getOriginalMovieDetail(
  id: string,
): Promise<OriginalMovieResult | null> {
  const movie = await Movie.findById(id);

  if (!movie) return null;

  const { _id, ...plainMovie } = movie.toObject() as MovieType & {
    _id: string;
  };

  return {
    title: plainMovie.title,
    overview: plainMovie.description,
    release_date: new Date(plainMovie.year + '-01-01').toISOString(),
    genres: plainMovie.genres.map((g, i) => ({ id: i, name: g })),
    backdrop_path: plainMovie.media?.backdrop?.originalPath,
    isOriginal: true,
    id: _id.toString(),
    media_type: 'movie',
  };
}
