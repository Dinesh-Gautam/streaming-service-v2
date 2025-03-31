'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Copy, Edit, MoreHorizontal, Play, Trash } from 'lucide-react';

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
import { PATHS } from '@/constants/paths';

import { DeleteMovieDialog } from './delete-movie-dialog';

// Mock data for movies
const initialMovies = [
  {
    id: '1',
    title: 'The Shawshank Redemption',
    description:
      'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    year: 1994,
    genres: ['Drama'],
    status: 'Published',
    videoUrl: 'https://example.com/videos/shawshank.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 100,
  },
  {
    id: '2',
    title: 'The Godfather',
    description:
      'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    year: 1972,
    genres: ['Crime', 'Drama'],
    status: 'Published',
    videoUrl: 'https://example.com/videos/godfather.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 100,
  },
  {
    id: '3',
    title: 'The Dark Knight',
    description:
      'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    year: 2008,
    genres: ['Action', 'Crime', 'Drama'],
    status: 'Published',
    videoUrl: 'https://example.com/videos/dark-knight.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 100,
  },
  {
    id: '4',
    title: 'Pulp Fiction',
    description:
      'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    year: 1994,
    genres: ['Crime', 'Drama'],
    status: 'Draft',
    videoUrl: 'https://example.com/videos/pulp-fiction.mpd',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 75,
  },
  {
    id: '5',
    title: 'Fight Club',
    description:
      'An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
    year: 1999,
    genres: ['Drama'],
    status: 'Draft',
    videoUrl: '',
    posterUrl: '/placeholder.svg?height=600&width=400',
    backdropUrl: '/placeholder.svg?height=1080&width=1920',
    transcodingProgress: 0,
  },
];

export function MoviesTable() {
  const [movies, setMovies] = useState(initialMovies);
  const [movieToDelete, setMovieToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDeleteMovie = (id: string) => {
    setMovies(movies.filter((movie) => movie.id !== id));
    setMovieToDelete(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
                    movie.transcodingProgress < 100 &&
                    movie.transcodingProgress > 0
                  ) ?
                    <div className="w-full max-w-24">
                      <Progress
                        value={movie.transcodingProgress}
                        className="h-2"
                      />
                      <div className="text-xs text-right mt-1">
                        {movie.transcodingProgress}%
                      </div>
                    </div>
                  : movie.transcodingProgress === 100 ?
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
                    {movie.videoUrl && movie.transcodingProgress === 100 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              copyToClipboard(movie.videoUrl, movie.id)
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
                        {movie.videoUrl &&
                          movie.transcodingProgress === 100 && (
                            <DropdownMenuItem asChild>
                              <a
                                href={movie.videoUrl}
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
