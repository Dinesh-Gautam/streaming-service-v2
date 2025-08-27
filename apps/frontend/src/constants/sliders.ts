export const SLIDERS = {
  Originals: 'originals',
  PopularMovies: 'popular_movies',
  NowPlaying: 'now_playing',
  TrendingMovies: 'trending_movies',
  TrendingTv: 'trending_tv',
} as const;

export const SLIDER_TITLES = {
  [SLIDERS.Originals]: 'Originals',
  [SLIDERS.PopularMovies]: 'Popular Movies',
  [SLIDERS.NowPlaying]: 'Now Playing',
  [SLIDERS.TrendingMovies]: 'Trending Movies',
  [SLIDERS.TrendingTv]: 'Trending TV Shows',
};
