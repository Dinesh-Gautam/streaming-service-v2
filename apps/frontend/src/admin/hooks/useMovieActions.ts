'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import type { Movie } from '@/app/(admin)/admin/movies/movies-table';

import { deleteMovie } from '@/app/(admin)/admin/movies/_action';
import { getPlaybackUrl } from '@/utils/url';

export function useMovieActions(initialMovies: Movie[]) {
  const [movies, setMovies] = useState(initialMovies);
  const [movieToDelete, setMovieToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDeleteMovie = async (id: string) => {
    const res = await deleteMovie(id);

    if (res.success) {
      setMovies(movies.filter((movie) => movie.id !== id));
      setMovieToDelete(null);
      toast.success('Movie deleted successfully!');
    } else {
      toast.error('Failed to delete movie', {
        description: res.message || 'An unexpected error occurred.',
      });
    }
  };

  const copyToClipboard = (id: string) => {
    const url = getPlaybackUrl(id);
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedId(id);
    toast.success('Playback URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return {
    movies,
    movieToDelete,
    copiedId,
    setMovieToDelete,
    handleDeleteMovie,
    copyToClipboard,
  };
}
