import { generateIdFromEntropySize, type User } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { handleLoggedIn } from '$lib/server/auth';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
  'activate-2fa': async (event) => {
    const user: User = event.locals.user;

    try {
      await db.update(users).set({ hasTwoFactor: true }).where(eq(users.id, user.id));
    } catch (err) {
      return {
        success: false
      };
    }

    return redirect(302, '/');
  }
};

export const load: PageServerLoad = async (event) => {
  handleLoggedIn(event);
  const user: User = event.locals.user;

  const twoFactorRecoveryCode = generateIdFromEntropySize(25); // 40 characters
  const twoFactorRecoveryCodeHash = encodeHex(
    await sha256(new TextEncoder().encode(twoFactorRecoveryCode))
  );

  await db
    .update(users)
    // .set({ twoFactorRecoveryHash: twoFactorRecoveryCodeHash, hasTwoFactor: true })
    .set({ twoFactorRecoveryHash: twoFactorRecoveryCodeHash, hasTwoFactor: false })
    .where(eq(users.id, user.id));

  return {
    twoFactorRecoveryCode: twoFactorRecoveryCode
  };
};
