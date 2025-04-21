import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { notFound } from 'next/navigation';

import { MediaPlayer, MediaProvider, Track } from '@vidstack/react';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';

import type { Movie as MovieType } from '@/app/(admin)/admin/movies/movies-table';
import { Movie } from '@/server/db/schemas/movie';
import { getOriginalMovieDetail } from '@/server/db/movies';

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

  // const playbackId = movie.media?.video?.id;
  // const playbackUrl = '/api/static/playback/' + playbackId + '/video.mpd';

  // const thumbnailsUrl =
  //   '/api/static/playback/' + playbackId + '/thumbnails.vtt';

  // const subtitleUrl = {
  //   en: '/api/static/playback/' + playbackId + '/' + playbackId + '.en.vtt',
  //   hi: '/api/static/playback/' + playbackId + '/' + playbackId + '.hi.vtt',
  //   pa: '/api/static/playback/' + playbackId + '/' + playbackId + '.pa.vtt',
  // };

  // const chaptersUrl = '/api/static/playback/' + playbackId + '/chapters.vtt';

  return (
    <div className="flex items-center justify-center max-h-screen overflow-hidden">
      <MediaPlayer
        viewType="video"
        load="visible"
        streamType="on-demand"
        posterLoad="visible"
        poster={'/api/static/' + movie.backdrop_path}
        style={{ height: '100vh' }}
        title={movie.title}
        src={movie.playbackUrl}
      >
        <MediaProvider />
        {movie.subtitles?.map((subtitle) => (
          <Track
            key={subtitle.language}
            kind="subtitles"
            lang={subtitle.language}
            label={new Intl.DisplayNames('en', {
              type: 'language',
            }).of(subtitle.language)}
            src={subtitle.url}
          />
        ))}

        <Track
          default={true}
          type="vtt"
          label="Chapters"
          lang="en"
          kind="chapters"
          src={movie.chaptersUrl}
        />
        <DefaultVideoLayout
          thumbnails={movie.thumbnailUrl}
          icons={defaultLayoutIcons}
        />
      </MediaPlayer>
    </div>
  );
}
