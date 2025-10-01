'use client';

import { useMemo } from 'react';

import type { MovieSchemaType } from '@/lib/validation/schemas';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin/components/ui/table';
import { useJobStatus } from '@/admin/hooks/use-job-status';

import { MovieTableRow } from '../../../../admin/components/MovieTableRow';
import { useMovieActions } from '../../../../admin/hooks/useMovieActions';
import { DeleteMovieDialog } from './delete-movie-dialog';

export type Movie = MovieSchemaType & { id: string };

export function MoviesTable({ movies: initialMovies }: { movies: Movie[] }) {
  const {
    movies,
    movieToDelete,
    copiedId,
    setMovieToDelete,
    handleDeleteMovie,
    copyToClipboard,
  } = useMovieActions(initialMovies);

  const mediaIds = useMemo(
    () =>
      movies.map((movie) => movie.media?.video?.id).filter(Boolean) as string[],
    [movies],
  );

  const { jobStatus: processingStatuses } = useJobStatus(mediaIds);

  console.log(processingStatuses);

  return (
    <>
      <div className="w-full overflow-auto">
        <Table className="w-full">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b border-muted">
              <TableHead>Title</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transcoding</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movies.map((movie) => {
              const mediaId = movie.media?.video?.id;
              const jobStatus =
                mediaId && processingStatuses ?
                  processingStatuses[mediaId]
                : null;

              return (
                <MovieTableRow
                  key={movie.id}
                  movie={movie}
                  job={jobStatus}
                  copiedId={copiedId}
                  onCopy={copyToClipboard}
                  onDelete={setMovieToDelete}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DeleteMovieDialog
        isOpen={!!movieToDelete}
        onClose={() => setMovieToDelete(null)}
        onConfirm={() => movieToDelete && handleDeleteMovie(movieToDelete)}
      />
    </>
  );
}
