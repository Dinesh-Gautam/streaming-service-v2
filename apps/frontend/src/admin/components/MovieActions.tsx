'use client';

import Link from 'next/link';

import { Copy, Edit, MoreHorizontal, Play, Trash } from 'lucide-react';

import type { Movie } from '@/app/(admin)/admin/movies/movies-table';
import type { MediaJob } from '@monorepo/core';

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/admin/components/ui/tooltip';
import { PATHS } from '@/constants/paths';
import { getPlaybackUrl } from '@/utils/url';

interface MovieActionsProps {
  movie: Movie;
  job: MediaJob | null;
  copiedId: string | null;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MovieActions({
  movie,
  job,
  copiedId,
  onCopy,
  onDelete,
}: MovieActionsProps) {
  const isCompleted = job?.status === 'completed';

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        {isCompleted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onCopy(movie.id)}
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
            {isCompleted && (
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
              onClick={() => onDelete(movie.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
