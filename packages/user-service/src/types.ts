import type z from 'zod';

import type { UserValidationSchema } from '@/validation';

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserSchemaType = z.infer<typeof UserValidationSchema>;
