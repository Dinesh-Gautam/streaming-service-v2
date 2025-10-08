'use server';

import 'server-only';

import { z } from 'zod';

/**
 * Saves movie data to the database (create or update).
 * @param data - Movie data to save.
 * @param id - Optional existing movie ID.
 * @returns Object with success status and message.
 */
import { authorize } from '@/lib/safe-action';
import { MovieSchema } from '@/lib/validation/schemas';
import dbConnect from '@/server/db/connect';
import { Movie } from '@/server/db/schemas/movie';

export const saveMovieData = authorize(
  () => async (data: z.infer<typeof MovieSchema>, id?: string) => {
    try {
      await dbConnect();
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
          message: `Validation Error: ${error.errors
            .map((e) => `${e.path.join('.')} - ${e.message}`)
            .join(', ')}`,
        };
      }
      return {
        success: false,
        message: `Failed to save movie: ${error.message}`,
      };
    }
  },
  ['ADMIN'],
);

export const deleteMovie = authorize(
  () => async (id: string) => {
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
  },
  ['ADMIN'],
);

// New action to apply AI suggestions
export const applyAISuggestions = authorize(
  () =>
    async (
      movieId: string,
      suggestions: {
        title: string;
        description: string;
        genres: string[];
      },
    ) => {
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
    },
  ['ADMIN'],
);
