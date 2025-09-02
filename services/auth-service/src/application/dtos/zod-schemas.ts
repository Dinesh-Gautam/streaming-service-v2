import { z } from "zod";

export const registerUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
