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
export const MovieSchema = BaseMovieSchema.superRefine((data, ctx) => {
  // Rule 1: If status is Published, all required fields must be present
  if (data.status === 'Published') {
    const missingFields = [
      !data.title && 'Title',
      !data.description && 'Description',
      !data.year && 'Year',
      (!data.genres || data.genres.length === 0) && 'Genres',
      !data.media?.video?.originalPath && 'Video',
      !data.media?.poster?.originalPath &&
        !data.media?.poster?.aiGeneratedPath &&
        'Poster',
      !data.media?.backdrop?.originalPath &&
        !data.media?.backdrop?.aiGeneratedPath &&
        'Backdrop',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The following fields are required to publish: ${missingFields.join(', ')}`,
        path: ['status'],
      });
    }
  }

  // Rule 2: Ensure the movie is not completely empty
  const hasContent =
    !!data.title ||
    !!data.description ||
    !!data.year ||
    (!!data.genres && data.genres.length > 0) ||
    !!data.media?.video?.originalPath ||
    !!data.media?.poster?.originalPath ||
    !!data.media?.backdrop?.originalPath;

  if (!hasContent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Cannot save a completely empty movie. Please fill in at least one detail or upload a media file.',
      path: ['title'], // Show error on a primary field
    });
  }
});

export type UserSchemaType = z.infer<typeof UserSchema>;
export type MovieSchemaType = z.infer<typeof MovieSchema>;
