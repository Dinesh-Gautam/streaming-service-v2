'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Copy, Edit, MoreHorizontal, Play, Trash } from 'lucide-react';
import type { z } from 'zod';

import { Badge } from '@/admin/components/ui/badge';
import { Button } from '@/admin/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/admin/components/ui/dropdown-menu';
import { Progress } from '@/admin/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/admin/components/ui/tooltip';
import {
  deleteMovie,
  getTranscodingProgress,
} from '@/app/(admin)/admin/movies/_action';
import { PATHS } from '@/constants/paths';
import type { MovieSchema } from '@/lib/validation/schemas';
import { getPlaybackUrl } from '@/utils/url';

import { DeleteMovieDialog } from './delete-movie-dialog';

export type Movie = z.infer<typeof MovieSchema> & { id: string };
export type TranscodingProgresses = {
  [key: string]: {
    progress: number;
    transcodingStarted?: boolean;
  };
};

export function MoviesTable({
  movies: initialMvoies,
  transcodingProgresses,
}: {
  movies: Movie[];
  transcodingProgresses: TranscodingProgresses;
}) {
  const [movies, setMovies] = useState(initialMvoies);
  const [movieToDelete, setMovieToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDeleteMovie = async (id: string) => {
    const res = await deleteMovie(id);

    if (res.success) {
      setMovies(movies.filter((movie) => movie.id !== id));
      setMovieToDelete(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(window.location.origin + text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [transcodignProgress, setTranscodingProgress] =
    useState<TranscodingProgresses>(transcodingProgresses);

  useEffect(() => {
    if (!transcodingProgresses) return;

    const videoIds = Object.entries(transcodingProgresses).filter(
      ([key, value]) => value.transcodingStarted,
    );

    if (videoIds.length === 0) return;

    const interval = setInterval(async () => {
      const res = await getTranscodingProgress(videoIds.map(([key]) => key));

      if (
        !res ||
        res.length === 0 ||
        !res.some((item) => item.transcodingStarted)
      ) {
        clearInterval(interval);
        return;
      }

      setTranscodingProgress((prev) => ({
        ...prev,
        ...Object.fromEntries(
          res.map((item) => [
            item.id,
            {
              progress: item.progress || 0,
              transcodingStarted: item.transcodingStarted,
            },
          ]),
        ),
      }));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <TooltipProvider>
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
            {movies.map((movie) => (
              <TableRow
                key={movie.id}
                className="border-b border-muted/50 hover:bg-muted/30"
              >
                <TableCell className="font-medium">{movie.title}</TableCell>
                <TableCell>{movie.year}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {movie.genres.map((genre) => (
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
                  <Badge
                    variant={
                      movie.status === 'Published' ? 'default' : 'secondary'
                    }
                  >
                    {movie.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(
                    movie.media?.video?.id &&
                    transcodignProgress &&
                    transcodignProgress[movie.media?.video?.id]!.progress <
                      100 &&
                    transcodignProgress[movie.media?.video?.id]!.progress > 0
                  ) ?
                    <div className="w-full max-w-24">
                      <Progress
                        value={
                          transcodignProgress[movie.media?.video?.id]!.progress
                        }
                        className="h-2"
                      />
                      <div className="text-xs text-right mt-1">
                        {transcodignProgress[
                          movie.media?.video?.id
                        ]!.progress.toFixed(1)}
                        %
                      </div>
                    </div>
                  : (
                    movie.media?.video?.id &&
                    transcodignProgress &&
                    transcodignProgress[movie.media?.video?.id]!.progress ===
                      100
                  ) ?
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      Complete
                    </Badge>
                  : <Badge
                      variant="outline"
                      className="bg-muted/50"
                    >
                      Not Started
                    </Badge>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {movie.media?.video?.originalPath &&
                      transcodignProgress &&
                      transcodignProgress[movie.media?.video?.id]!.progress ===
                        100 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                copyToClipboard(
                                  getPlaybackUrl(movie.id),
                                  movie.id,
                                )
                              }
                            >
                              {copiedId === movie.id ?
                                <Badge className="h-5 w-5 p-0 flex items-center justify-center">
                                  ✓
                                </Badge>
                              : <Copy className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy video URL</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={PATHS.ADMIN.MOVIES + '/' + movie.id}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {movie.media?.video?.originalPath &&
                          transcodignProgress?.[movie.media.video.id]
                            .progress === 100 && (
                            <DropdownMenuItem asChild>
                              <a
                                href={getPlaybackUrl(movie.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Preview
                              </a>
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuItem
                          onClick={() => setMovieToDelete(movie.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DeleteMovieDialog
        isOpen={!!movieToDelete}
        onClose={() => setMovieToDelete(null)}
        onConfirm={() => movieToDelete && handleDeleteMovie(movieToDelete)}
      />
    </TooltipProvider>
  );
}
