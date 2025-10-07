import type { Movie as MovieType } from '@/app/(admin)/admin/movies/movies-table';
import type { MediaType } from '@/lib/types';
import type {
  AIEngineOutput,
  SubtitleOutput,
  ThumbnailOutput,
  TranscodingOutput,
} from '@monorepo/workers';
import type {
  MoviesGetDetailsGenre,
  MoviesGetPopularResult,
} from 'tmdb-js-web';

import { getJobByMediaId } from '@/actions/admin/job';
import dbConnect from '@/server/db/connect';
import { Movie } from '@/server/db/schemas/movie';

await dbConnect();

export type OriginalMovieResult = Omit<
  Partial<MoviesGetPopularResult>,
  'id'
> & {
  id: string;
  isOriginal: boolean;
  genres: MoviesGetDetailsGenre[];
  media_type: MediaType;
};

export async function getOriginalMovies(): Promise<OriginalMovieResult[]> {
  await dbConnect();
  const movies = await Movie.find({
    status: 'Published',
  })
    .sort({ createdAt: -1 })
    .limit(20);

  return movies.map((movie: any) => {
    const { _id, ...plainMovie } = movie.toObject() as MovieType & {
      _id: string;
    };

    return {
      title: plainMovie.title,
      overview: plainMovie.description,
      release_date: new Date(plainMovie.year + '-01-01').toISOString(),
      genres: plainMovie.genres?.map((g, i) => ({ id: i, name: g })) || [],
      backdrop_path: getStaticUrl(plainMovie.media?.backdrop?.originalPath),
      isOriginal: true,
      id: _id.toString(),
      media_type: 'movie',
    };
  });
}

export type OriginalMovieDetail = Promise<
  | (OriginalMovieResult &
      Partial<{
        subtitles: {
          language: string;
          url: string;
        }[];
        aiGeneratedSubtitles: {
          language: string;
          url: string;
        }[];
        aiGeneratedAudio: {
          language: string;
          url: string;
        }[];
        thumbnailUrl: string;
        playbackUrl: string;
        chaptersUrl: string;
      }>)
  | null
>;

export async function getOriginalMovieDetail(
  id: string,
): Promise<OriginalMovieDetail> {
  await dbConnect();

  const movie = await Movie.findOne<MovieType>({
    _id: id,
    status: 'Published',
  }).lean<MovieType>();

  if (!movie) return null;

  const mediaId = movie.media?.video?.id;

  if (!mediaId) return null;

  const job = await getJobByMediaId(mediaId);

  let endResult = {
    title: movie.title,
    overview: movie.description,
    release_date: new Date(movie.year + '-01-01').toISOString(),
    genres: movie.genres?.map((g, i) => ({ id: i, name: g })) || [],
    poster_path: getStaticUrl(movie.media?.poster?.originalPath),
    backdrop_path: getStaticUrl(movie.media?.backdrop?.originalPath),
    isOriginal: true,
    id,
    media_type: 'movie' as MediaType,
  };

  if (!job) return endResult;

  if (job.status === 'completed') {
    const tasks = job.tasks.filter((t) => t.status === 'completed');
    if (tasks.length > 0) {
      const appendResult = tasks.reduce((acc, task) => {
        if (task.status !== 'completed') return acc;

        if (task.worker === 'subtitle') {
          const subtitleOutput = task.output as SubtitleOutput;

          const paths = subtitleOutput.vttPaths;

          if (!paths) return acc;

          const textTracks = Object.entries(paths).map(([language, path]) => {
            return {
              language,
              url: getStaticUrl(path),
            };
          });

          return {
            ...acc,
            subtitles: textTracks,
          };
        }

        if (task.worker === 'thumbnail') {
          return {
            ...acc,
            thumbnailUrl: getStaticUrl(
              (task.output as ThumbnailOutput).paths.vtt,
            ),
          };
        }

        if (task.worker === 'transcode') {
          return {
            ...acc,
            playbackUrl: getStaticUrl(
              (task.output as TranscodingOutput).manifestDir +
                '/' +
                (task.output as TranscodingOutput).manifest,
            ),
          };
        }

        if (task.worker === 'ai') {
          const aiOutput = task.output as AIEngineOutput;

          const subtitles = aiOutput.data.subtitles;
          const audio = aiOutput.data.dubbedAudioPaths;
          const paths = subtitles?.vttPaths;

          return {
            ...acc,
            chaptersUrl: getStaticUrl(aiOutput.data.chapters?.vttPath),
            ...(audio ?
              {
                aiGeneratedAudio: Object.entries(audio).map(
                  ([language, path]) => ({
                    language,
                    url: getStaticUrl(path),
                  }),
                ),
              }
            : {}),
            ...(paths ?
              {
                aiGeneratedSubtitles: Object.entries(paths).map(
                  ([language, path]) => ({
                    language,
                    url: getStaticUrl(path),
                  }),
                ),
              }
            : {}),
          };
        }
        return acc;
      }, {});
      endResult = {
        ...endResult,
        ...appendResult,
      };
    }
  }
  return endResult;
}

function getStaticUrl(path: string | undefined) {
  if (!path) return undefined;
  return `/api/static/${path}`;
}
