import PopularMoviesBanner from '@/components/home/Banner';
import Slider from '@/components/home/Slider';
import { DEFAULT_PAGE_REVALIDATION_TIME } from '@/constants/config';
import { getPopularMovies } from '@/server/tmdb';
import { omitResutlsWithNoBannerImage } from '@/utils/tmdb';

export const dynamic = 'force-static';
export const revalidate = DEFAULT_PAGE_REVALIDATION_TIME;

export default async function Home() {
  const popularMovies = await getPopularMovies();
  return (
    <>
      <PopularMoviesBanner
        popularMovies={omitResutlsWithNoBannerImage(popularMovies.results)}
      />
      <Slider
        title="Trending Movies"
        data={omitResutlsWithNoBannerImage(popularMovies.results)}
      />
    </>
  );
}
