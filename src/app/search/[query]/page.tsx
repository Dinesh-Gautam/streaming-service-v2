import { notFound } from 'next/navigation';

import type {
  GenresGetMovieListGenre,
  SearchMultiSearchResponse,
} from 'tmdb-js-web';

import { Nav } from '@/components/nav';
import { SearchResult } from '@/components/search/search-result';
import { ContextProvider } from '@/context/state-context';
import {
  cachedGetGenere as cachedGetGenre,
  cachedMultiSearch,
} from '@/server/tmdb';

type SearchPageProps = { params: Promise<{ query: string }> };

export const dynamic = 'force-dynamic';

export default async function SearchPage({ params }: SearchPageProps) {
  const { query } = await params;

  // const session = await getSession(context);

  if (!query) {
    return notFound();
  }

  const genre = await cachedGetGenre();
  const searchResult = await cachedMultiSearch({ query, include_adult: false });

  const mappedResults = searchResult.results.map((res) => {
    return {
      ...res,
      genre_ids:
        res.genre_ids &&
        res.genre_ids.map((id) => genre.find((gen) => gen.id === id)),
    };
  });

  return (
    <SearchResultDetailPage
      query={decodeURIComponent(query)}
      result={mappedResults}
      isSignedIn={false}
    />
  );
}

export type SearchResultDetailPageProps = {
  query: string;
  result: (Omit<SearchMultiSearchResponse['results'][number], 'genre_ids'> & {
    genre_ids: (GenresGetMovieListGenre | undefined)[] | undefined;
  })[];
  isSignedIn: boolean;
};

function SearchResultDetailPage({
  query,
  result,
  isSignedIn,
}: SearchResultDetailPageProps) {
  return (
    <ContextProvider>
      {query ?
        <div>
          <Nav
            signedIn={isSignedIn}
            searchInitialValue={query}
          />
          {result && result.length ?
            <SearchResult results={result} />
          : <h1
              style={{
                width: 'fit-content',
                margin: 'auto',
                padding: '2rem',
                color: 'white',
                opacity: 0.5,
              }}
            >
              No Movies or Tv Shows Found
            </h1>
          }
        </div>
      : <div>
          <Nav
            searchInitialValue={''}
            signedIn={isSignedIn}
          />
          <h1
            style={{
              width: 'fit-content',
              margin: 'auto',
              padding: '2rem',
              color: 'white',
              opacity: 0.5,
            }}
          >
            Search your favorite movie or Tv series
          </h1>
        </div>
      }
    </ContextProvider>
  );
}
