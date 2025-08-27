
'use client';

import '@vidstack/react/player/styles/default/layouts/video.css';
import '@vidstack/react/player/styles/default/theme.css';



import { OriginalMovieDetail } from '@/server/db/movies';
import { MediaPlayer, MediaPlayerInstance, MediaProvider, Track } from '@vidstack/react';
import {
    defaultLayoutIcons,
    DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';
import { useRef } from 'react';


export function Player({ movie }: { movie: Awaited<OriginalMovieDetail> }) {
    const player = useRef<MediaPlayerInstance>(null);

    if (!movie) {
        return null;
    }

    return <MediaPlayer
        ref={player}
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
}