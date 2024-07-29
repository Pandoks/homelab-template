import { z } from 'zod';
import { base64, base32, base64url } from 'oslo/encoding';

export const base64Schema = z.string().refine(
  (str) => {
    try {
      return base64.encode(base64.decode(str)) === str;
    } catch {
      return false;
    }
  },
  { message: 'Invalid base64 string' }
);

export const base64UrlSchema = z.string().refine(
  (str) => {
    try {
      return base64url.encode(base64url.decode(str)) === str;
    } catch {
      return false;
    }
  },
  { message: 'Invalid base64url string' }
);

export const base32Schema = z.string().refine(
  (str) => {
    try {
      return base32.encode(base32.decode(str)) === str;
    } catch {
      return false;
    }
  },
  { message: 'Invalid base32 string' }
);
