'use client';

import 'lite-youtube-embed';

import React, { useEffect, useRef } from 'react';

import styles from '@/styles/modules/youtubePlayer.module.scss';

import type LiteYTEmbed from 'lite-youtube-embed';

import { useYoutubePlayer } from './context';

interface YoutubeVideoPlayerProps {
  roundedBorder?: boolean;
}

const YoutubeVideoPlayer: React.FC<YoutubeVideoPlayerProps> = ({
  roundedBorder,
}) => {
  const { videosData, ytPlayerRef, playerState, id, setVideoPlayerReady } =
    useYoutubePlayer();

  const playerRef = useRef<LiteYTEmbed | null>(null);

  useEffect(() => {
    (async () => {
      if (!playerRef.current) return;

      const ytplayer = await playerRef.current.getYTPlayer();

      if (!ytplayer) return;
      /* it may be deprecated in the future */
      ytplayer.setSize(1920, 1080);
      /*
      youtube lite api autoplays the video by default,
      to prevent that we stop the video
      */
      ytplayer.stopVideo();

      ytPlayerRef.current = ytplayer;

      setVideoPlayerReady(true);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef.current]);

  useEffect(() => {
    setVideoPlayerReady(false);

    return () => {
      if (!ytPlayerRef.current) return;

      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const videoId =
    videosData?.length > 0 &&
    videosData.find((e) => e.id === id)?.videos[0]?.key;

  return (
    videoId && (
      <div
        style={{
          opacity: playerState.playing ? 1 : 0,
          borderRadius: roundedBorder ? 12 : 0,
          overflow: 'hidden',
        }}
        className={styles.container}
      >
        <lite-youtube
          ref={playerRef}
          videoid={videoId}
          params="rel=0&showinfo=0&controls=0&disablekb=1&enablejsapi=1"
          js-api
        />
      </div>
    )
  );
};

export default YoutubeVideoPlayer;
