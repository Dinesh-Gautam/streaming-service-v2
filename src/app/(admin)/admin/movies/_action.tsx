'use server';

import 'server-only';

import { error } from 'console';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';

import ffmpeg from 'fluent-ffmpeg';
import type { z } from 'zod';

import type { MovieSchema } from '@/lib/validation/schemas';
import dbConnect from '@/server/db/connect';
import { Movie, TranscodingProgress } from '@/server/db/schemas/movie';

await dbConnect();

const UPLOAD_TYPES = {
  VIDEO: 'video',
  POSTER: 'poster',
  BACKDROP: 'backdrop',
} as const;

const tempDir = process.env.TEMP_DIR || '/tmp';

export async function uploadAction(
  formData: FormData,
  type: (typeof UPLOAD_TYPES)[keyof typeof UPLOAD_TYPES],
) {
  const file = formData.get('file') as File;

  console.log('file', file);

  if (!file) {
    throw new Error('File is required');
  }

  // temp random unique file name
  const objectId = Math.random().toString(36).substring(2, 15);

  const filePath = join(process.cwd(), tempDir, type, objectId);
  const dirPath = join(process.cwd(), tempDir, type);

  console.log('filePath', filePath);

  if (!existsSync(dirPath)) {
    console.log('Creating directory:', dirPath);
    mkdirSync(dirPath, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  console.log('buffer', buffer);

  const writeStream = createWriteStream(filePath);

  console.log('writestream path', writeStream.path);

  await new Promise((resolve, reject) => {
    writeStream.on('open', () => {
      console.log('Write stream opened');
    });

    writeStream.on('finish', () => {
      console.log('Write stream finished');
      resolve(true);
    });
    writeStream.on('error', (err) => {
      writeStream.destroy();
      console.error('Error writing file:', err);
      reject(err);
    });
    writeStream.write(buffer);
    writeStream.end();
  });

  return { success: true, path: `${type}/${objectId}`, id: objectId };
}

export async function processVideo(videoPath: string, id: string) {
  // height, bitrate
  const sizes = [
    [240, 350],
    [480, 700],
    [720, 2500],
    [1080, 10000],
  ];

  const outputFileName = 'video';
  const outputDirName = id;

  const targetdir = path.resolve(
    path.join('converted/mpdVideos', outputDirName),
  );

  const sourcefn = path.resolve('tmp', videoPath);

  console.log('source', sourcefn);
  console.log('info', sizes);
  console.log('info', targetdir);

  try {
    fs.statSync(targetdir);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      fs.mkdirSync(targetdir, { recursive: true });
    } else {
      throw err;
    }
  }

  var proc = ffmpeg({
    source: sourcefn,
    cwd: targetdir,
  });

  var targetfn = path.join(targetdir, `${outputFileName}.mpd`);

  console.log('targetFIleName : ' + targetfn);

  proc
    .addOption('-loglevel', 'debug')
    .output(targetfn)
    .format('dash')
    .videoCodec('libx264')
    .audioCodec('aac')
    .audioChannels(2)
    .audioFrequency(44100)
    .outputOptions([
      '-preset veryfast',
      '-keyint_min 60',
      '-g 60',
      '-sc_threshold 0',
      '-profile:v main',
      '-use_template 1',
      '-use_timeline 1',
      '-b_strategy 0',
      '-bf 1',
      '-map 0:a',
      '-b:a 96k',
    ]);

  for (var size of sizes) {
    let index = sizes.indexOf(size);

    proc.outputOptions([
      `-filter_complex [0]format=pix_fmts=yuv420p[temp${index}];[temp${index}]scale=-2:${size[0]}[A${index}]`,
      `-map [A${index}]:v`,
      `-b:v:${index} ${size[1]}k`,
    ]);
  }

  proc.on('start', function (commandLine) {
    console.log('progress', 'Spawned Ffmpeg with command: ' + commandLine);
  });

  let totalTime: any;

  proc
    .on('codecData', (data) => {
      totalTime = parseInt(data.duration.replace(/:/g, ''));
    })
    .on('progress', function (info) {
      if (!info.percent && totalTime !== undefined) {
        const time = parseInt(info.timemark.replace(/:/g, ''));

        const percent = (time / totalTime) * 100;

        info.percent = Number(percent.toFixed(2));
      }

      updateMovieProgressData(id, info);
    })

    .on('stderr', function (stderrLine) {
      console.log('Stderr output: ' + stderrLine);
    })

    .on('end', async function () {
      console.log('complete');
      await updateMovieProgressData(id, { completed: true });
      // await saveMovieData({
      //   title,
      //   uid,
      //   videoFileName: `${name}.mpd`,
      //   videoFileDir: dirName,
      // });
    })

    .on('error', function (err) {
      console.log('error', err);
      updateMovieProgressData(id, { error: true, errorMessage: err.message });
    });

  return proc.run();
}

type ProgressData = {
  percent?: number;
  completed?: boolean;
  error?: boolean;
  errorMessage?: string;
};

async function updateMovieProgressData(videoId: string, data: ProgressData) {
  const { completed, error, errorMessage, percent } = data;

  console.log('updateMovieProgressData', data);

  const progressData: any = {
    videoId,
    progress: percent || 0,
  };

  if (completed) {
    progressData.progress = 100;
  }

  if (error) {
    progressData.error = error;
    progressData.errorMessage = errorMessage;
  }

  const res = await TranscodingProgress.findOneAndUpdate(
    { videoId },
    progressData,
    { upsert: true, new: true },
  );

  return res;
}

type TranscodingStatus = {
  progress: number;
  transcodingStarted: boolean;
  error?: string;
};

type TranscodingStatusWithId = TranscodingStatus & {
  id: string;
};

export async function getTranscodingProgress<T extends string | string[]>(
  id: T,
): Promise<T extends string ? TranscodingStatus : TranscodingStatusWithId[]> {
  try {
    if (Array.isArray(id)) {
      const res = await TranscodingProgress.find({
        videoId: { $in: id },
      }).lean();

      const progress: TranscodingStatusWithId[] = res.map((item) => ({
        id: item.videoId,
        progress: item.progress || 0,
        transcodingStarted: true,
        error: item.errorMessage,
      }));

      const missingIds = id.filter(
        (videoId) => !res.some((item) => item.videoId === videoId),
      );

      missingIds.forEach((videoId) => {
        progress.push({
          id: videoId,
          progress: 0,
          transcodingStarted: false,
          error: undefined,
        });
      });

      return progress as any;
    }

    const res = await TranscodingProgress.findOne({
      videoId: id,
    });

    const status: TranscodingStatus =
      res ?
        {
          progress: res.progress || 0,
          transcodingStarted: true,
          error: res.errorMessage,
        }
      : {
          progress: 0,
          transcodingStarted: false,
          error: undefined,
        };

    return status as any;
  } catch (error) {
    console.error('Error fetching transcoding progress:', error);
    throw new Error('Failed to fetch transcoding progress');
  }
}

export async function saveMovieData(
  data: z.infer<typeof MovieSchema>,
  id?: string,
) {
  try {
    if (!id) {
      await Movie.create(data);
    } else {
      await Movie.findByIdAndUpdate(id, data);
    }

    return { success: true };
  } catch (error) {
    console.log('error', error);
    return { success: false, message: 'Error creating movie' };
  }
}

export async function deleteMovie(id: string) {
  try {
    await Movie.findByIdAndDelete(id);

    return { success: true };
  } catch (error) {
    console.log('error', error);
    return { success: false, message: 'Error deleting movie' };
  }
}
