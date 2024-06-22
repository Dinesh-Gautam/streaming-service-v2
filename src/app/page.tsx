import PopularMoviesBanner from "@/components/home/Banner";
import { DEFAULT_PAGE_REVALIDATION_TIME } from "@/config";
import { getPopularMovies } from "../server/tmdb";

export const revalidate = DEFAULT_PAGE_REVALIDATION_TIME;

export default async function Home() {
    const popularMovies = await getPopularMovies();
    return <>
        {<PopularMoviesBanner popularMovies={popularMovies.results} />}
    </>
}

