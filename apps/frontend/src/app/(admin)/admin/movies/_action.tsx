'use server';

import 'server-only';

import { z } from 'zod';

import type { MediaJob } from '@monorepo/core';

import { generateImagePrompt, generateImageWithPrompt } from '@/lib/ai/images';
import { MovieSchema } from '@/lib/validation/schemas';
import dbConnect from '@/server/db/connect';
import { Movie } from '@/server/db/schemas/movie';

await dbConnect();

/**
 * Fetches the current status and progress of one or more media processing jobs.
 * @param mediaIds - Single media ID or array of media IDs
 * @returns Object containing status for each requested media ID
 */
// export async function getMediaProcessingJob(
//   mediaIds: string | string[],
// ): Promise<{ [key: string]: MediaProcessingStatus }> {
//   // Normalize input to array
//   const ids = Array.isArray(mediaIds) ? mediaIds : [mediaIds];

//   if (!ids.length) {
//     console.warn(
//       '[Action] getMediaProcessingJob called without valid mediaIds.',
//     );
//     return {};
//   }

//   try {
//     await dbConnect();
//     // Find all jobs matching the provided IDs
//     const jobs = await MediaProcessingJob.find({
//       mediaId: { $in: ids },
//     }).lean<IMediaProcessingJob[]>();

//     // Create result object
//     const result: { [key: string]: MediaProcessingStatus } = {};

//     // Initialize default status for all requested IDs
//     ids.forEach((id) => {
//       result[id] = {
//         jobStatus: 'pending',
//         tasks: [],
//         jobExists: false,
//       };
//     });

//     // Update with actual job data where available
//     jobs.forEach((job) => {
//       if (!job.mediaId) return;

//       const formattedTasks = job.tasks.map((task: IMediaProcessingTask) => ({
//         taskId: task.taskId,
//         engine: task.engine,
//         status: task.status,
//         progress: task.progress || 0,
//         error: task.errorMessage || undefined,
//         // Ensure output is included and is serializable
//         output:
//           task.output ? JSON.parse(JSON.stringify(task.output)) : undefined,
//       }));

//       result[job.mediaId] = {
//         jobStatus: job.jobStatus,
//         tasks: formattedTasks,
//         jobExists: true,
//       };
//     });

//     return result;
//   } catch (error: any) {
//     console.error('[Action] Error fetching media processing jobs:', ids, error);
//     // Return default pending status on error
//     const errorResult: { [key: string]: MediaProcessingStatus } = {};
//     ids.forEach((id) => {
//       errorResult[id] = {
//         jobStatus: 'pending',
//         tasks: [],
//         jobExists: false,
//       };
//     });
//     return errorResult;
//   }
// }

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
    return {
      success: false,
      error: (error as Error).message || 'Unkown error message',
    };
  }
}

export async function suggestImagePrompt(
  type: 'poster' | 'backdrop',
  movieData: {
    title: string;
    description: string;
    genres: string[];
    initialPrompt: string;
  },
) {
  try {
    const prompt = await generateImagePrompt({
      input: movieData,
      type,
    });

    return { success: true, prompt };
  } catch (error) {
    console.error('Error suggesting image prompt:', error);
    return {
      success: false,
      error:
        error instanceof Error ?
          error.message
        : 'Unknown error generating prompt',
    };
  }
}
