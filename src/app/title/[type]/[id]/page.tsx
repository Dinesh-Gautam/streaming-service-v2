import { notFound } from 'next/navigation';

import TitleView from '@/components/title';
import { YoutubeVideoPlayerProvider } from '@/components/youtube';
import { ContextProvider } from '@/context/state-context';
import type { MediaType } from '@/lib/types';
import { cachedGeMovietDetails, cachedTvDetails } from '@/server/tmdb';

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

  let searchResult;

  // if (!original) {
  searchResult =
    media_type === 'movie' ?
      await cachedGeMovietDetails(Number(id), {
        append_to_response: ['external_ids'],
      })
    : media_type === 'tv' ?
      await cachedTvDetails(Number(id), {
        append_to_response: ['external_ids'],
      })
    : null;

  // if (media_type === 'tv') {
  //   searchResult.seasonInfo = await getDetails(id, media_type, {
  //     type: 'season',
  //   });
  // }
  // } else {
  //   searchResult = await getOriginalMovieDetails(id);
  //   searchResult.original = Boolean(original);
  // }

  if (!searchResult) return notFound();

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
