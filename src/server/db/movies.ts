import type {
  MoviesGetDetailsGenre,
  MoviesGetPopularResult,
} from 'tmdb-js-web';

import type { Movie as MovieType } from '@/app/(admin)/admin/movies/movies-table';
import { AIEngineOutput, SubtitleOutputData } from '@/lib/media/engine-outputs';
import type { MediaType } from '@/lib/types';
import dbConnect from '@/server/db/connect';
import { Movie } from '@/server/db/schemas/movie';

import {
  IMediaProcessingJob,
  MediaProcessingJob,
} from './schemas/media-processing';

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
  const movies = await Movie.find({}).sort({ createdAt: -1 }).limit(20);

  return movies.map((movie: any) => {
    const { _id, ...plainMovie } = movie.toObject() as MovieType & {
      _id: string;
    };

    return {
      title: plainMovie.title,
      overview: plainMovie.description,
      release_date: new Date(plainMovie.year + '-01-01').toISOString(),
      genres: plainMovie.genres.map((g, i) => ({ id: i, name: g })),
      backdrop_path: plainMovie.media?.backdrop?.originalPath,
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
  const movie = await Movie.findById(id).lean<MovieType>();

  if (!movie) return null;

  const mediaId = movie.media?.video?.id;

  const job = await MediaProcessingJob.findOne({
    mediaId,
  }).lean<IMediaProcessingJob>();

  let endResult = {
    title: movie.title,
    overview: movie.description,
    release_date: new Date(movie.year + '-01-01').toISOString(),
    genres: movie.genres.map((g, i) => ({ id: i, name: g })),
    poster_path: movie.media?.poster?.originalPath,
    backdrop_path: movie.media?.backdrop?.originalPath,
    isOriginal: true,
    id,
    media_type: 'movie' as MediaType,
  };

  if (job?.jobStatus === 'completed') {
    const tasks = job.tasks.filter((t) => t.status === 'completed');

    if (tasks.length > 0) {
      const appendResult = tasks.reduce((acc, task) => {
        if (task.status !== 'completed') return acc;

        if (task.engine === 'SubtitleEngine') {
          const subtitleOutput = task.output as SubtitleOutputData;

          const paths = subtitleOutput.paths?.vtt;

          if (!paths) return acc;

          const textTracks = Object.entries(paths).map(([language]) => {
            return {
              language,
              url: `/api/static/playback/${mediaId}/${mediaId}.${language}.vtt`,
            };
          });

          return {
            ...acc,
            subtitles: textTracks,
          };
        }

        if (task.engine === 'ThumbnailEngine') {
          return {
            ...acc,
            thumbnailUrl: `/api/static/playback/${mediaId}/thumbnails.vtt`,
          };
        }

        if (task.engine === 'TranscodingEngine') {
          return {
            ...acc,
            playbackUrl: `/api/static/playback/${mediaId}/video.mpd`,
          };
        }

        if (task.engine === 'AIEngine') {
          const aiOutput = task.output as AIEngineOutput;
          const subtitles = aiOutput.data.subtitles;
          const audio = aiOutput.data.dubbedAudioPaths;
          const paths = subtitles?.vttPaths;

          return {
            ...acc,
            chaptersUrl: `/api/static/playback/${mediaId}/${mediaId}.chapters.vtt`,
            ...(audio ?
              {
                aiGeneratedAudio: Object.entries(audio).map(([language]) => ({
                  language,
                  url: `/api/static/playback/${mediaId}/${mediaId}.${language}.dubbed.mp3`,
                })),
              }
            : {}),
            ...(paths ?
              {
                aiGeneratedSubtitles: Object.entries(paths).map(
                  ([language]) => ({
                    language,
                    url: `/api/static/playback/${mediaId}/${mediaId}.${language}.ai.vtt`,
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
