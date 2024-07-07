import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(4)
  .max(31)
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Special characters are not allowed except: '_' and '-'"
  }); // alphabets + numbers + _ + - (4 ~ 31 characters long)

export const emailSchema = z.string().email();

export const passwordSchema = z.string().min(8).max(255);
