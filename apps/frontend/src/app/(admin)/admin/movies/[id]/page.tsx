import { notFound } from 'next/navigation';

import type { Movie as MovieType } from '@/app/(admin)/admin/movies/movies-table';

import EditMoviePage from '@/app/(admin)/admin/movies/[id]/edit-movie';
import dbConnect from '@/server/db/connect';
import { Movie } from '@/server/db/schemas/movie';

type EditMoviePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: EditMoviePageProps) {
  const { id } = await params;

  await dbConnect();

  let data;

  const isNewMovie = id === 'new';

  if (!isNewMovie) {
    data = await Movie.findById(id);

    if (!data) return notFound();

    const { _id, ...plainMovie } = data.toObject();

    data = {
      ...plainMovie,
    } as MovieType;
  }

  console.log(data);

  return (
    <EditMoviePage
      id={id}
      defaultValues={data}
      isNewMovie={isNewMovie}
    />
  );
}
