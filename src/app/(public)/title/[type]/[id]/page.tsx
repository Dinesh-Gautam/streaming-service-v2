import { notFound } from 'next/navigation';

import TitleView, {
  type MovieResult,
  type Result,
  type TvResult,
} from '@/components/title';
import { YoutubeVideoPlayerProvider } from '@/components/youtube';
import { ContextProvider } from '@/context/state-context';
import type { MediaType } from '@/lib/types';
import {
  getOriginalMovieDetail,
  type OriginalMovieResult,
} from '@/server/db/movies';
import {
  cachedGeMovietDetails,
  cachedTvDetails,
  cachedTvSeasonInfo,
} from '@/server/tmdb';

type TitlePageParams = {
  id: string;
  type: MediaType;
};

type TitlePageSearchQueryParams = {
  t?: string;
  original?: 'true';
};

type Props = {
  params: Promise<TitlePageParams>;
  searchParams: Promise<TitlePageSearchQueryParams>;
};

export const dynamic = 'force-dynamic';

export default async function TitlePage({ params, searchParams }: Props) {
  const { id, type: media_type } = await params;
  const { t: layout_type, original } = await searchParams;

  const isOriginal = original === 'true';

  let searchResult: Result | OriginalMovieResult | null;

  if (!isOriginal) {
    searchResult =
      media_type === 'movie' ?
        ((await cachedGeMovietDetails(Number(id), {
          append_to_response: ['external_ids'],
        })) as MovieResult)
      : media_type === 'tv' ?
        ((await cachedTvDetails(Number(id), {
          append_to_response: ['external_ids'],
        })) as TvResult)
      : null;

    if (!searchResult) return notFound();

    if (media_type === 'tv') {
      (searchResult as TvResult).seasonInfo = await cachedTvSeasonInfo(
        Number(id),
        1,
      );
    }
  } else {
    searchResult = await getOriginalMovieDetail(id);
  }

  console.log(searchResult);
  if (!searchResult) {
    return notFound();
  }

  return (
    <ContextProvider>
      <YoutubeVideoPlayerProvider
        id={Number(id)}
        media_type={media_type}
      >
        <TitleView
          media_type={media_type}
          result={searchResult}
          layout_type={layout_type}
          original={original === 'true'}
        />
      </YoutubeVideoPlayerProvider>
    </ContextProvider>
  );
}
