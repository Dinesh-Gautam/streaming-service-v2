'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { getTitleTrailerVideos } from './_actions';
import {
  PlayerState,
  VideoData,
  VideoPlayerContextProps,
  YoutubeVideoPlayerProviderProps,
} from './types';

const videoPlayerContext = createContext<VideoPlayerContextProps>(
  {} as VideoPlayerContextProps,
);

export function useYoutubePlayer() {
  return useContext(videoPlayerContext);
}

function YoutubeVideoPlayerProvider({
  id,
  media_type,
  children,
}: YoutubeVideoPlayerProviderProps) {
  const ytPlayerRef = useRef<YT.Player | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    playing: false,
    muted: false,
  });
  const [videosData, setVideosData] = useState<VideoData[]>([]);
  const [videoPlayerReady, setVideoPlayerReady] = useState<boolean>(false);

  const contextValues: VideoPlayerContextProps = {
    ytPlayerRef,
    playerState,
    setPlayerState,
    id,
    media_type,
    videosData,
    setVideosData,
    videoPlayerReady,
    setVideoPlayerReady,
  };

  async function getVideosData() {
    const data = await getTitleTrailerVideos(id, media_type);

    if (!data) return;

    setVideosData((prev) => [
      ...prev,
      {
        id,
        videos: data,
      },
    ]);
  }

  useEffect(() => {
    setPlayerState((prev) => ({ ...prev, playing: false }));

    if (!id || videosData.find((e) => e.id === id)) return;

    getVideosData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, media_type]);

  return (
    <videoPlayerContext.Provider value={contextValues}>
      {children}
    </videoPlayerContext.Provider>
  );
}

export default YoutubeVideoPlayerProvider;
