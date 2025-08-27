'use client';

import styles from '@/styles/modules/youtubeControlButtons.module.scss';

import {
  Pause,
  PlayArrow,
  VolumeOff,
  VolumeUpRounded,
} from '@mui/icons-material';
import { AnimatePresence } from 'motion/react';

import FadeInOnMount from '@/components/fade-on-load';

import { useYoutubePlayer } from './context';

type ButtonProps = {
  size?: 'small' | 'large';
};

type YoutubeControlButtonsProps = {} & ButtonProps;

function YoutubeControlButtons({ size = 'small' }: YoutubeControlButtonsProps) {
  const { playerState, id, videosData, videoPlayerReady } = useYoutubePlayer();

  const hasVideos = !!videosData.find((e) => e.id === id)?.videos.length;

  return (
    <div className={styles.videoControls}>
      <AnimatePresence>
        {playerState.playing && (
          <FadeInOnMount>
            <MuteButton size={size} />
          </FadeInOnMount>
        )}
        {hasVideos && videoPlayerReady && (
          <FadeInOnMount>
            <PlayButton size={size} />
          </FadeInOnMount>
        )}
      </AnimatePresence>
    </div>
  );
}

function MuteButton({ size }: ButtonProps) {
  const { playerState, setPlayerState, ytPlayerRef } = useYoutubePlayer();

  const SIZE = {
    SMALL: 42,
    LARGE: 68,
  };

  // same width and the height
  const height = size === 'large' ? SIZE.LARGE : SIZE.SMALL;
  const width = height;

  return (
    <button
      style={{
        height,
        width,
      }}
      onClick={() => {
        if (!ytPlayerRef.current) return;

        const muteState = ytPlayerRef.current.isMuted();

        muteState ? ytPlayerRef.current.unMute() : ytPlayerRef.current.mute();

        setPlayerState((prev) => ({
          ...prev,
          muted: !muteState,
        }));
      }}
    >
      {playerState.muted ?
        <VolumeOff fontSize={size} />
      : <VolumeUpRounded fontSize={size} />}
    </button>
  );
}

function PlayButton({ size }: ButtonProps) {
  const { playerState, setPlayerState, ytPlayerRef } = useYoutubePlayer();

  const SIZE = {
    SMALL: 42,
    LARGE: 68,
  };

  // same width and the height
  const height = size === 'large' ? SIZE.LARGE : SIZE.SMALL;
  const width = height;

  return (
    <button
      style={{
        height,
        width,
      }}
      onClick={() => {
        if (!ytPlayerRef.current) return;

        !playerState.playing ?
          ytPlayerRef.current.playVideo()
        : ytPlayerRef.current.pauseVideo();

        setPlayerState((prev) => ({
          ...prev,
          playing: !playerState.playing,
        }));
      }}
    >
      {playerState.playing ?
        <Pause fontSize={size || 'small'} />
      : <PlayArrow fontSize={size || 'small'} />}
    </button>
  );
}

export default YoutubeControlButtons;
