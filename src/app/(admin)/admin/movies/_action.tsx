'use server';

import 'server-only';

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { join } from 'path';

import { z } from 'zod';

import { generateImageWithPrompt } from '@/lib/ai/images';
import { EngineTaskOutput } from '@/lib/media/engine-outputs'; // Import the output union type
import { AIEngine } from '@/lib/media/engines/ai-engine'; // Import the new AI Engine
import { SubtitleEngine } from '@/lib/media/engines/subtitle';
import { ThumbnailEngine } from '@/lib/media/engines/thumbnail-engine';
import { TranscodingEngine } from '@/lib/media/engines/transcoding-engine';
import { MediaManager } from '@/lib/media/media-manager';
import { MovieSchema } from '@/lib/validation/schemas';
import dbConnect from '@/server/db/connect';
import {
  MediaProcessingJob,
  type IMediaProcessingJob,
  type IMediaProcessingTask,
} from '@/server/db/schemas/media-processing';
import { Movie } from '@/server/db/schemas/movie';

await dbConnect();

const UPLOAD_TYPES = {
  VIDEO: 'video',
  POSTER: 'poster',
  BACKDROP: 'backdrop',
} as const;

const tempDir = process.env.TEMP_DIR || 'tmp';

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

/**
 * Initiates the media processing pipeline (thumbnails, transcoding) for a video.
 * This function starts the process in the background and returns immediately.
 * The frontend should poll `getMediaProcessingJob` for progress updates.
 * @param videoPath - Relative path of the uploaded video in the temp directory (e.g., 'video/xyz123').
 * @param mediaId - The unique identifier for the media (e.g., Movie ID).
 */
export async function processVideo(
  videoPath: string,
  mediaId: string,
): Promise<{ success: boolean; message?: string }> {
  console.log(`[Action] processVideo called for mediaId: ${mediaId}`);

  if (!videoPath || !mediaId) {
    console.error('[Action] processVideo: Missing videoPath or mediaId.');
    return { success: false, message: 'Missing video path or media ID.' };
  }

  const outputDirName = mediaId; // Use mediaId for the output directory name
  const targetDir = path.resolve(
    process.cwd(), // Ensure path is absolute from project root
    'converted/playback',
    outputDirName,
  );
  const sourceFile = path.resolve(process.cwd(), tempDir, videoPath); // Absolute path to temp file

  console.log(`[Action] Source file: ${sourceFile}`);
  console.log(`[Action] Target directory: ${targetDir}`);

  // Ensure target directory exists
  try {
    if (!existsSync(targetDir)) {
      console.log(`[Action] Creating target directory: ${targetDir}`);
      mkdirSync(targetDir, { recursive: true });
    }
  } catch (err: any) {
    console.error(
      `[Action] Error creating target directory ${targetDir}:`,
      err,
    );
    return {
      success: false,
      message: `Failed to create output directory: ${err.message}`,
    };
  }

  // Ensure source file exists
  if (!existsSync(sourceFile)) {
    console.error(`[Action] Source file not found: ${sourceFile}`);
    return { success: false, message: 'Source video file not found.' };
  }

  try {
    await dbConnect(); // Ensure DB connection

    // Instantiate engines
    const thumbnailEngine = new ThumbnailEngine();
    const transcodingEngine = new TranscodingEngine();
    const subtitleEngine = new SubtitleEngine({
      sourceLanguage: 'en', // Specify source language
      targetLanguages: ['hi', 'pa'], // Specify target languages
    }); // Instantiate SubtitleEngine with options
    const aiEngine = new AIEngine(); // Instantiate the AI Engine

    // Instantiate manager with all engines in desired order
    // MediaManager will reorder if AI engine is before Subtitle engine
    const mediaManager = new MediaManager(mediaId, [
      // thumbnailEngine,
      // transcodingEngine,
      subtitleEngine,
      aiEngine, // Add AI Engine to the list
    ]);

    // Run the manager - DO NOT await this here.
    // Let it run in the background. The manager handles DB updates.
    mediaManager.run(sourceFile, targetDir).catch((runError) => {
      // Catch errors during the async run execution (e.g., initial setup errors in run)
      console.error(
        `[Action] Error during mediaManager.run() for ${mediaId}:`,
        runError,
      );
      // Note: Specific engine errors are handled within MediaManager and update the DB job status.
      // This catch is for broader issues in the run() method itself.
    });

    console.log(`[Action] Media processing initiated for mediaId: ${mediaId}`);
    return {
      success: true,
      message: 'Media processing initiated successfully.',
    };
  } catch (error: any) {
    console.error(
      `[Action] Failed to initiate media processing for ${mediaId}:`,
      error,
    );
    return {
      success: false,
      message: `Failed to initiate processing: ${error.message}`,
    };
  }
}

// Type definition for the progress data returned to the frontend
export type MediaProcessingStatus = {
  jobStatus: IMediaProcessingJob['jobStatus'];
  tasks: Array<{
    taskId: string;
    engine: string;
    status: IMediaProcessingTask['status'];
    progress: number;
    error?: string;
    output?: EngineTaskOutput; // Use the specific union type
  }>;
  // Indicate if a job record exists at all
  jobExists: boolean;
};

/**
 * Fetches the current status and progress of one or more media processing jobs.
 * @param mediaIds - Single media ID or array of media IDs
 * @returns Object containing status for each requested media ID
 */
export async function getMediaProcessingJob(
  mediaIds: string | string[],
): Promise<{ [key: string]: MediaProcessingStatus }> {
  // Normalize input to array
  const ids = Array.isArray(mediaIds) ? mediaIds : [mediaIds];

  if (!ids.length) {
    console.warn(
      '[Action] getMediaProcessingJob called without valid mediaIds.',
    );
    return {};
  }

  try {
    await dbConnect();
    // Find all jobs matching the provided IDs
    const jobs = await MediaProcessingJob.find({
      mediaId: { $in: ids },
    }).lean<IMediaProcessingJob[]>();

    // Create result object
    const result: { [key: string]: MediaProcessingStatus } = {};

    // Initialize default status for all requested IDs
    ids.forEach((id) => {
      result[id] = {
        jobStatus: 'pending',
        tasks: [],
        jobExists: false,
      };
    });

    // Update with actual job data where available
    jobs.forEach((job) => {
      if (!job.mediaId) return;

      const formattedTasks = job.tasks.map((task: IMediaProcessingTask) => ({
        taskId: task.taskId,
        engine: task.engine,
        status: task.status,
        progress: task.progress || 0,
        error: task.errorMessage || undefined,
        // Ensure output is included and is serializable
        output:
          task.output ? JSON.parse(JSON.stringify(task.output)) : undefined,
      }));

      result[job.mediaId] = {
        jobStatus: job.jobStatus,
        tasks: formattedTasks,
        jobExists: true,
      };
    });

    return result;
  } catch (error: any) {
    console.error('[Action] Error fetching media processing jobs:', ids, error);
    // Return default pending status on error
    const errorResult: { [key: string]: MediaProcessingStatus } = {};
    ids.forEach((id) => {
      errorResult[id] = {
        jobStatus: 'pending',
        tasks: [],
        jobExists: false,
      };
    });
    return errorResult;
  }
}

/**
 * Saves movie data to the database (create or update).
 * @param data - Movie data to save.
 * @param id - Optional existing movie ID.
 * @returns Object with success status and message.
 */
export async function saveMovieData(
  data: z.infer<typeof MovieSchema>,
  id?: string,
) {
  try {
    const validatedData = MovieSchema.parse(data); // Validate data first

    await dbConnect();

    const movieDataToSave = {
      title: validatedData.title,
      description: validatedData.description,
      year: validatedData.year,
      genres: validatedData.genres,
      status: validatedData.status,
      isAIGenerated: validatedData.isAIGenerated || false, // Default to false if undefined
      // Ensure media paths are correctly structured and saved
      media: {
        video:
          validatedData.media?.video ?
            {
              id: validatedData.media.video.id,
              originalPath: validatedData.media.video.originalPath,
            }
            : undefined,
        poster:
          validatedData.media?.poster ?
            {
              id: validatedData.media.poster.id,
              originalPath: validatedData.media.poster.originalPath,
              aiGeneratedPath: validatedData.media.poster.aiGeneratedPath,
            }
            : undefined,
        backdrop:
          validatedData.media?.backdrop ?
            {
              id: validatedData.media.backdrop.id,
              originalPath: validatedData.media.backdrop.originalPath,
              aiGeneratedPath: validatedData.media.backdrop.aiGeneratedPath,
            }
            : undefined,
      },
      // Add other fields as necessary
    };

    if (id) {
      // Update existing movie
      await Movie.findByIdAndUpdate(id, movieDataToSave);
      console.log(`[Action] Updated movie with ID: ${id}`);
    } else {
      // Create new movie
      const newMovie = new Movie(movieDataToSave);
      await newMovie.save();
      console.log(`[Action] Created new movie with ID: ${newMovie._id}`);
    }
    return { success: true, message: 'Movie saved successfully.' };
  } catch (error: any) {
    console.error('[Action] Error saving movie data:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation Error: ${error.errors.map((e) => `${e.path.join('.')} - ${e.message}`).join(', ')}`,
      };
    }
    return {
      success: false,
      message: `Failed to save movie: ${error.message}`,
    };
  }
}

export async function deleteMovie(id: string) {
  try {
    await dbConnect(); // Ensure DB connection
    await Movie.findByIdAndDelete(id);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting movie:', error);
    return {
      success: false,
      message: `Error deleting movie: ${error.message}`,
    };
  }
}

// New action to apply AI suggestions
export async function applyAISuggestions(
  movieId: string,
  suggestions: {
    title: string;
    description: string;
    genres: string[];
  },
) {
  if (!movieId) {
    return {
      success: false,
      message: 'No movie ID provided',
    };
  }

  try {
    await dbConnect(); // Ensure DB connection
    const updateData = {
      ...suggestions,
      isAIGenerated: true, // Set the flag
    };
    await Movie.findByIdAndUpdate(movieId, updateData);
    console.log(`[Action] Applied AI suggestions for movie ID: ${movieId}`);
    return { success: true };
  } catch (error: any) {
    console.error(
      `[Action] Error applying AI suggestions for movie ID ${movieId}:`,
      error,
    );
    return {
      success: false,
      message: `Error applying AI suggestions: ${error.message}`,
    };
  }
}

export async function generateAIImagesWithPrompt(
  prompt: string,
  type: 'poster' | 'backdrop',
) {
  try {
    console.log(
      '[Action] Generating AI images with prompt:',
      prompt,
      'of type:',
      type,
    );
    const { success, path, id } = await generateImageWithPrompt(prompt, {
      type,
    });

    return { success, path, id };
  } catch (error) {
    console.error('Error generating AI images:', error);
    return { success: false, error: error };
  }
}
