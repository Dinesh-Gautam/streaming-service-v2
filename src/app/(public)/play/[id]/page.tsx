import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { notFound } from 'next/navigation';

import { MediaPlayer, MediaProvider } from '@vidstack/react';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';

import { Movie } from '@/server/db/schemas/movie';

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const movie = await Movie.findById(id);

  if (!movie) {
    return notFound();
  }

  const playbackId = movie.media?.video?.id;
  const playbackUrl = '/api/static/playback/' + playbackId + '/video.mpd';

  return (
    <div className="flex items-center justify-center max-h-screen overflow-hidden">
      <MediaPlayer
        style={{ height: '100vh' }}
        title="Sprite Fight"
        src={playbackUrl}
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}
