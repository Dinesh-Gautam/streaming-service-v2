
import { notFound } from 'next/navigation';

import { getOriginalMovieDetail } from '@/server/db/movies';
import { DynamicPlayer } from './dynamic';

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const movie = await getOriginalMovieDetail(id);

  if (!movie) {
    return notFound();
  }

  console.log(movie);



  return (
    <div className="flex items-center justify-center max-h-screen overflow-hidden">
      <DynamicPlayer movie={movie} />
    </div>
  );
}
