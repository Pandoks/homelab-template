import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(4)
  .max(31)
  .regex(/^[a-zA-Z0-9_-]{4-31}$/); // alphabets + numbers + _ + - (4 ~ 31 characters long)

export const emailSchema = z.string().email();

export const passwordSchema = z.string().min(6).max(255);
