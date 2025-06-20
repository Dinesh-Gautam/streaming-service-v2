'use client';

import { PropsWithChildren } from 'react';

import { MoviesGetVideosResult, TVGetVideosResult } from 'tmdb-js-web';

import { MediaType } from '@/lib/types';

export interface VideoData {
  id: number;
  videos: MoviesGetVideosResult[] | TVGetVideosResult[];
}

export type PlayerState = { playing: boolean; muted: boolean };

export interface VideoPlayerContextProps {
  ytPlayerRef: React.MutableRefObject<YT.Player | null>;
  playerState: PlayerState;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
  id: number | null;
  media_type: MediaType;
  videosData: VideoData[];
  setVideosData: React.Dispatch<React.SetStateAction<VideoData[]>>;
  videoPlayerReady: boolean;
  setVideoPlayerReady: React.Dispatch<React.SetStateAction<boolean>>;
}

export type YoutubeVideoPlayerProviderProps = {
  id: number | null;
  media_type: MediaType;
} & PropsWithChildren<{}>;
