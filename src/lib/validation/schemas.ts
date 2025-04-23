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

export const MovieSchema = z.object({
  title: z.string().min(2, {
    message: 'Title must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear(), {
      message: `Year must be between 1900 and ${new Date().getFullYear()}.`,
    }),
  genres: z.array(z.string()).min(1, {
    message: 'Please select at least one genre.',
  }),
  status: z.string().min(1, {
    message: 'Please select a status.',
  }),
  media: z
    .object({
      video: z
        .object({
          originalPath: z.string().min(1, {
            message: 'Please select a video file.',
          }),
          id: z.string().min(1, {
            message: 'Please select a video file.',
          }),
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
    .optional()
    .refine(
      (media) => {
        return media?.video?.originalPath && media?.video?.id;
      },
      {
        message: 'A video file must be uploaded.',
        path: ['media', 'video'],
      },
    )
    .refine(
      (media) => {
        return media?.poster?.originalPath || media?.poster?.aiGeneratedPath;
      },
      {
        message: 'Please upload a poster image or generate one using AI.',
        path: ['media', 'poster'],
      },
    )
    .refine(
      (media) => {
        return (
          media?.backdrop?.originalPath || media?.backdrop?.aiGeneratedPath
        );
      },
      {
        message: 'Please upload a backdrop image or generate one using AI.',
        path: ['media', 'backdrop'],
      },
    ),
  isAIGenerated: z.boolean().optional(),
});

export type UserSchemaType = z.infer<typeof UserSchema>;
export type MovieSchemaType = z.infer<typeof MovieSchema>;
