'use client';

import type { Movie } from '@/app/(admin)/admin/movies/movies-table';
import type { MediaJob } from '@monorepo/core';

import { MediaProcessingStatus } from '@/admin/components/media-processing-status';
import { Badge } from '@/admin/components/ui/badge';
import { TableCell, TableRow } from '@/admin/components/ui/table';

import { MovieActions } from './MovieActions';

interface MovieTableRowProps {
  movie: Movie;
  job: MediaJob | null;
  copiedId: string | null;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MovieTableRow({
  movie,
  job,
  copiedId,
  onCopy,
  onDelete,
}: MovieTableRowProps) {
  return (
    <TableRow
      key={movie.id}
      className="border-b border-muted/50 hover:bg-muted/30"
    >
      <TableCell className="font-medium">{movie.title}</TableCell>
      <TableCell>{movie.year}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {movie.genres?.map((genre) => (
            <Badge
              key={genre}
              variant="outline"
              className="bg-muted/50"
            >
              {genre}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={movie.status === 'Published' ? 'default' : 'secondary'}>
          {movie.status}
        </Badge>
      </TableCell>
      <TableCell>
        <MediaProcessingStatus job={job} />
      </TableCell>
      <TableCell>
        <MovieActions
          movie={movie}
          job={job}
          copiedId={copiedId}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
