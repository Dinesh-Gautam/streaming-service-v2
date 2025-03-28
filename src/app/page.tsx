import PopularMoviesBanner from '@/components/home/Banner';
import Slider from '@/components/home/Slider';
import { HoverCardProvider } from '@/components/hover-card/provider';
import { Nav } from '@/components/nav';
import { SLIDER_TITLES, SLIDERS } from '@/constants/sliders';
import { ContextProvider } from '@/context/state-context';
import {
  cachedGetNowPlayingMovies,
  cachedGetPopularMovies,
  cachedGetTrending,
} from '@/server/tmdb';
import { omitResutlsWithNoBannerImage } from '@/utils/tmdb';

export const dynamic = 'force-static';
export const revalidate = 86400;

export default async function Home() {
  const [popularMovies, nowPlaying, trendingMovies, trendingTv] =
    await Promise.all([
      cachedGetPopularMovies({}),
      cachedGetNowPlayingMovies(),
      cachedGetTrending('movie', 'week'),
      cachedGetTrending('tv', 'week'),
    ]);

  const sliderData = {
    [SLIDERS.PopularMovies]: omitResutlsWithNoBannerImage(
      popularMovies.results,
    ),
    [SLIDERS.NowPlaying]: omitResutlsWithNoBannerImage(nowPlaying.results),
    [SLIDERS.TrendingMovies]: omitResutlsWithNoBannerImage(
      trendingMovies.results,
    ),
    [SLIDERS.TrendingTv]: omitResutlsWithNoBannerImage(trendingTv.results),
  };

  return (
    <ContextProvider>
      {/* // todo: make singedIn dynamic} */}
      <Nav signedIn={false} />
      <PopularMoviesBanner
        popularMovies={omitResutlsWithNoBannerImage(popularMovies.results)}
      />
      <HoverCardProvider {...sliderData}>
        {Object.entries(sliderData).map(([id, data]) => (
          <Slider
            title={SLIDER_TITLES[id as keyof typeof SLIDER_TITLES]}
            key={id}
            data={data}
            id={id}
          />
        ))}
      </HoverCardProvider>
    </ContextProvider>
  );
}
