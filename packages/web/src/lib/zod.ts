import {
  decodeBase32,
  decodeBase64,
  decodeBase64url,
  encodeBase32LowerCase,
  encodeBase64,
  encodeBase64url
} from '@oslojs/encoding';
import { z } from 'zod';

export const base64Schema = z.string().refine(
  (str) => {
    try {
      return encodeBase64(decodeBase64(str)) === str;
    } catch {
      return false;
    }
  },
  { message: 'Invalid base64 string' }
);

export const base64UrlSchema = z.string().refine(
  (str) => {
    try {
      return encodeBase64url(decodeBase64url(str)) === str;
    } catch {
      return false;
    }
  },
  { message: 'Invalid base64url string' }
);

export const base32Schema = z.string().refine(
  (str) => {
    try {
      return encodeBase32LowerCase(decodeBase32(str)) === str;
    } catch {
      return false;
    }
  },
  { message: 'Invalid base32 string' }
);
