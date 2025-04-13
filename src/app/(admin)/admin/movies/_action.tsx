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
  const outputFileName = 'video';
  const outputDirName = id;

  const targetDir = path.resolve(
    path.join('converted/playback', outputDirName),
  );

  const sourceFile = path.resolve('tmp', videoPath);

  console.log('source', sourceFile);
  console.log('info', targetDir);

  try {
    fs.statSync(targetDir);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      fs.mkdirSync(targetDir, { recursive: true });
    } else {
      throw err;
    }
  }

  await createThumbnails(sourceFile, targetDir, id);

  let totalTime: any;
  const command = ffmpeg({
    source: sourceFile,
    cwd: targetDir,
  });

  command
    // Video codec settings
    .videoCodec('libx264')
    .addOption('-preset', 'veryfast')
    .addOption('-profile:v', 'main')
    .addOption('-keyint_min', '60')
    .addOption('-g', '60')
    .addOption('-sc_threshold', '0')

    // Audio codec settings
    .audioCodec('aac')
    .audioBitrate('128k')

    // DASH specific settings
    .addOption('-use_timeline', '1')
    .addOption('-use_template', '1')
    .addOption('-seg_duration', '5')
    .addOption('-adaptation_sets', 'id=0,streams=v id=1,streams=a')
    .addOption('-init_seg_name', 'init-stream$RepresentationID$.$ext$')
    .addOption(
      '-media_seg_name',
      'chunk-stream$RepresentationID$-$Number%05d$.$ext$',
    )

    // Create multiple representations in a single command
    .addOption('-map', '0:v')
    .addOption('-map', '0:v')
    .addOption('-map', '0:v')
    .addOption('-map', '0:v')
    .addOption('-map', '0:v')
    .addOption('-map', '0:a')

    // 240p stream
    .addOption('-s:v:0', '426x240')
    .addOption('-b:v:0', '400k')
    .addOption('-maxrate:v:0', '480k')
    .addOption('-bufsize:v:0', '800k')

    // 360p stream
    .addOption('-s:v:1', '640x360')
    .addOption('-b:v:1', '800k')
    .addOption('-maxrate:v:1', '960k')
    .addOption('-bufsize:v:1', '1600k')

    // 480p stream
    .addOption('-s:v:2', '854x480')
    .addOption('-b:v:2', '1200k')
    .addOption('-maxrate:v:2', '1440k')
    .addOption('-bufsize:v:2', '2400k')

    // 720p stream
    .addOption('-s:v:3', '1280x720')
    .addOption('-b:v:3', '2400k')
    .addOption('-maxrate:v:3', '2880k')
    .addOption('-bufsize:v:3', '4800k')

    // 1080p stream
    .addOption('-s:v:4', '1920x1080')
    .addOption('-b:v:4', '4800k')
    .addOption('-maxrate:v:4', '5760k')
    .addOption('-bufsize:v:4', '9600k')

    // Format and output
    .format('dash')
    .output(path.join(targetDir, outputFileName + '.mpd'));

  command
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
    })

    .on('error', function (err) {
      console.log('error', err);
      updateMovieProgressData(id, {
        error: true,
        errorMessage: err.message,
      });
    });

  command.run();

  const targetFilename = path.join(targetDir, `${outputFileName}.mpd`);

  console.log('targetFIleName : ' + targetFilename);
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

  try {
    const res = await TranscodingProgress.findOneAndUpdate(
      { videoId },
      progressData,
      { upsert: true, new: true },
    );

    return res;
  } catch (e: any) {
    console.error('Error saving progress data', error);
  }
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

async function createThumbnails(
  inputFile: string,
  outputDir: string,
  videoId: string,
) {
  const thumbnailsDir = path.join(outputDir, 'thumbnails');

  // Ensure output directories exist
  [outputDir, thumbnailsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  await generateThumbnails(inputFile, thumbnailsDir, outputDir, videoId);
}

// Function to get video duration
function getVideoDuration(videoPath: string): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration);
    });
  });
}

// Function to format time for VTT (HH:MM:SS.mmm)
function formatVttTime(seconds: number) {
  const date = new Date(seconds * 1000);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${secs}.${ms}`;
}

// Generate thumbnails and VTT file
async function generateThumbnails(
  inputPath: string,
  thumbnailsDir: string,
  outputDir: string,
  videoId: string,
) {
  try {
    // Get video duration
    const duration = await getVideoDuration(inputPath);

    if (!duration) {
      console.error(
        'Generating Thumbnails error:',
        'could not get the duration of the video',
      );
      return;
    }

    console.log(`Video duration: ${duration} seconds`);

    // For short videos, use a shorter interval
    let interval = 5;

    // Calculate how many thumbnails we'll generate
    const thumbnailCount = Math.ceil(duration / interval);

    console.log(`Generating ${thumbnailCount} thumbnails...`);

    // Generate thumbnails with smaller size
    ffmpeg(inputPath)
      .outputOptions([
        // Extract frames at specified interval and resize to smaller dimensions
        `-vf fps=1/${interval},scale=240:-1`, // 160px width, maintain aspect ratio
        '-q:v 1', // JPEG quality (1-31, lower is better)
        '-f image2',
      ])
      .output(path.join(thumbnailsDir, 'thumb%04d.jpg'))
      .on('end', () => {
        console.log('Thumbnail generation complete');
        // Now generate the VTT file with complete coverage
        generateVttFile(thumbnailCount, interval, duration, outputDir, videoId);
      })
      .on('error', (err) => {
        console.error('Error generating thumbnails:', err);
      })
      .run();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Generate WebVTT file
function generateVttFile(
  thumbnailCount: number,
  interval: number,
  duration: number,
  outputDir: string,
  videoId: string,
) {
  const vttFile = path.join(outputDir, 'thumbnails.vtt');
  let vttContent = 'WEBVTT\n\n';

  // Generate cues to cover the entire video
  for (let i = 0; i < thumbnailCount; i++) {
    const startTime = i * interval;
    let endTime;

    // For the last thumbnail, ensure it covers to the end of the video
    if (i === thumbnailCount - 1) {
      endTime = duration;
    } else {
      endTime = (i + 1) * interval;
    }

    // Format timestamps
    const startTimeFormatted = formatVttTime(startTime);
    const endTimeFormatted = formatVttTime(endTime);

    // Add cue
    vttContent += `${startTimeFormatted} --> ${endTimeFormatted}\n`;
    vttContent += `/api/static/playback/${videoId}/thumbnails/thumb${(i + 1).toString().padStart(4, '0')}.jpg\n\n`;
  }

  // Write VTT file
  fs.writeFileSync(vttFile, vttContent);
  console.log(`WebVTT file created: ${vttFile}`);
}
