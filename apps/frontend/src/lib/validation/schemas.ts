import { z } from 'zod';

import { USER_ROLES } from '@/lib/types';

export const UserSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  role: z.enum(Object.values(USER_ROLES) as [string, ...string[]], {
    message: "Role must be either 'admin' or 'user'.",
  }),
  password: z
    .string()
    .min(1, {
      message: 'Password is required.',
    })
    .optional(),
});

// Create a base schema with all fields optional
const BaseMovieSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear(), {
      message: `Year must be between 1900 and ${new Date().getFullYear()}.`,
    })
    .optional(),
  genres: z.array(z.string()).optional(),
  status: z.enum(['Draft', 'Published']),
  media: z
    .object({
      video: z
        .object({
          originalPath: z.string().min(1),
          id: z.string().min(1),
        })
        .optional(),
      poster: z
        .object({
          originalPath: z.string().optional(),
          id: z.string().optional(),
          aiGeneratedPath: z.string().optional(),
        })
        .optional(),
      backdrop: z
        .object({
          originalPath: z.string().optional(),
          id: z.string().optional(),
          aiGeneratedPath: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  isAIGenerated: z.boolean().optional(),
});

// Add refinement to validate that when status is "Published", all required fields are present
export const MovieSchema = BaseMovieSchema.refine(
  (data) => {
    // If status is Draft, no additional validation needed
    if (data.status === 'Draft') return true;

    // If status is Published, all these fields must be present
    return !!(
      data.title &&
      data.description &&
      data.year &&
      data.genres &&
      data.genres.length > 0 &&
      data.media?.video?.originalPath &&
      (data.media?.poster?.originalPath ||
        data.media?.poster?.aiGeneratedPath) &&
      (data.media?.backdrop?.originalPath ||
        data.media?.backdrop?.aiGeneratedPath)
    );
  },
  {
    message:
      'All fields must be filled to publish a movie. Make sure you have title, description, year, at least one genre, video, poster, and backdrop.',
    path: ['status'], // This shows the error on the status field
  },
);

export type UserSchemaType = z.infer<typeof UserSchema>;
export type MovieSchemaType = z.infer<typeof MovieSchema>;
