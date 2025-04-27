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
        src={[
          ...(movie.playbackUrl ? [{
            src: movie.playbackUrl,
            type: 'application/dash+xml' as const,
          }] : []),
          ...(movie.aiGeneratedAudio?.map((audio) => ({
            src: audio.url,
            type: 'audio/mpeg' as const,
          })) || []),
        ]}
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

        {movie.aiGeneratedSubtitles?.map((subtitle) => (
          <Track
            key={subtitle.language}
            kind="subtitles"
            lang={subtitle.language}
            label={new Intl.DisplayNames('en', {
              type: 'language',
            }).of(subtitle.language) + ' (AI)'}
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
