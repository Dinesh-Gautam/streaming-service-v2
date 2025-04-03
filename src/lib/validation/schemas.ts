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

export type UserSchemaType = z.infer<typeof UserSchema>;
