import Link from 'next/link';

import { PlusCircle } from 'lucide-react';

import { Button } from '@/admin/components/ui/button';
import { getTranscodingProgress } from '@/app/(admin)/admin/movies/_action';
import { PATHS } from '@/constants/paths';
import { Movie } from '@/server/db/schemas/movie';

import { MoviesTable, type TranscodingProgresses } from './movies-table';

export default async function MoviesPage() {
  let movies = await Movie.find({}).sort({ createdAt: -1 });

  movies = movies.map((movie) => {
    const { _id, ...plainMovie } = movie.toObject();
    return {
      ...plainMovie,
      id: _id.toString(),
    };
  });

  const videoIds = movies
    .map((movie) => movie.media?.video?.id)
    .filter(Boolean) as string[];

  let transcodingProgresses;

  if (videoIds.length) {
    const res = await getTranscodingProgress(videoIds);

    transcodingProgresses = res.reduce((acc, item) => {
      acc[item.id] = {
        progress: item.progress || 0,
        transcodingStarted: item.transcodingStarted,
      };
      return acc;
    }, {} as TranscodingProgresses);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Movies Management</h1>
        <Button asChild>
          <Link href={PATHS.ADMIN.NEW_MOVIE}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Movie
          </Link>
        </Button>
      </div>
      {movies.length > 0 && transcodingProgresses ?
        <MoviesTable
          movies={movies}
          transcodingProgresses={transcodingProgresses}
        />
      : <p className="text-muted-foreground">No movies found.</p>}
    </div>
  );
}
