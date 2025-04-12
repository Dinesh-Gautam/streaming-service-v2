import { notFound } from 'next/navigation';

import { getTranscodingProgress } from '@/app/(admin)/admin/movies/_action';
import EditMoviePage from '@/app/(admin)/admin/movies/[id]/edit-movie';
import type { Movie as MovieType } from '@/app/(admin)/admin/movies/movies-table';
import { Movie } from '@/server/db/schemas/movie';

type EditMoviePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: EditMoviePageProps) {
  const { id } = await params;

  let data, transcodingStarted;

  const isNewMovie = id === 'new';

  if (!isNewMovie) {
    data = await Movie.findById(id);

    if (!data) return notFound();

    const { _id, ...plainMovie } = data.toObject();

    data = {
      ...plainMovie,
    } as MovieType;

    const videoId = data.media?.video?.id;

    if (!videoId) {
      transcodingStarted = false;
    } else {
      const { transcodingStarted: _ts } = await getTranscodingProgress(videoId);
      transcodingStarted = _ts;
    }
  }

  return (
    <EditMoviePage
      id={id}
      defaultValues={data}
      isNewMovie={isNewMovie}
      transcodingStarted={transcodingStarted}
    />
  );
}
