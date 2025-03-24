import PopularMoviesBanner from '@/components/home/Banner';
import Slider from '@/components/home/Slider';
import { DEFAULT_PAGE_REVALIDATION_TIME } from '@/constants/config';
import {
  getNowPlayingMovies,
  getPopularMovies,
  getTrending,
} from '@/server/tmdb';
import { omitResutlsWithNoBannerImage } from '@/utils/tmdb';

export const dynamic = 'force-static';
export const revalidate = DEFAULT_PAGE_REVALIDATION_TIME;

export default async function Home() {
  const [popularMovies, nowPlaying, trendingMovies, trendingTv] =
    await Promise.all([
      getPopularMovies(),
      getNowPlayingMovies(),
      getTrending('movie', 'week'),
      getTrending('tv', 'week'),
    ]);

  return (
    <>
      <PopularMoviesBanner
        popularMovies={omitResutlsWithNoBannerImage(popularMovies.results)}
      />
      <Slider
        title="Trending Movies"
        data={omitResutlsWithNoBannerImage(popularMovies.results)}
      />
      <Slider
        title="Now Playing"
        data={omitResutlsWithNoBannerImage(nowPlaying.results)}
      />
      <Slider
        title="Trending Movies"
        data={omitResutlsWithNoBannerImage(trendingMovies.results)}
      />
      <Slider
        title="Trending Tv"
        data={omitResutlsWithNoBannerImage(trendingTv.results)}
      />
    </>
  );
}
