import {
  type Dispatch,
  type MutableRefObject,
  type PropsWithChildren,
  type Ref,
  type SetStateAction,
} from 'react';

import type {
  MoviesGetNowPlayingResult,
  MoviesGetPopularResult,
  TrendingGetTrendingResult,
} from 'tmdb-js-web';

import type { SLIDERS } from '@/constants/sliders';
import type { MediaType } from '@/lib/types';

type Result = {
  media_type?: MediaType;
  first_air_date?: string;
  name?: string;
};

export type sliderResults =
  | (MoviesGetPopularResult & Result)
  | (MoviesGetNowPlayingResult & Result)
  | (TrendingGetTrendingResult & Result);

export type HoverCardProviderProps = PropsWithChildren<{
  [key in (typeof SLIDERS)[keyof typeof SLIDERS]]: sliderResults[];
}>;

export type hoverCardPositionState = {
  type: (typeof SLIDERS)[keyof typeof SLIDERS];
  x: number;
  y: number;
  original?: 'true' | 'false';
  index?: string;
  height?: number;
  width?: number;
};

export type hoverCardContext = {
  hoverCardPosition: hoverCardPositionState;
  hoverCardActive: boolean;
  timeOutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  animating: boolean;
  setAnimating: Dispatch<SetStateAction<boolean>>;
  clearHover: Function;
  getHoverCardMovie: () => sliderResults;
};
