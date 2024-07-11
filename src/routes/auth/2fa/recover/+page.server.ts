import { z } from 'zod';
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import { lucia } from '$lib/server/auth';
import { sha256 } from 'oslo/crypto';
import { encodeHex } from 'oslo/encoding';
import { users } from '$lib/db/schema';

export const actions: Actions = {
  'recover-2fa': async (event) => {
    const formData = await event.request.formData();
    const twoFactorRecoveryCode = formData.get('twoFactoryRecoveryCode');
    if (!z.string().safeParse(twoFactorRecoveryCode).success) {
      return fail(400, {
        message: 'Invalid recovery code'
      });
    }
    const { user, session } = await lucia.validateSession(event.locals.session.id);
    if (!user || !user.hasTwoFactor || session.isTwoFactorVerified) {
      redirect(302, '/');
    }

    const twoFactorRecoveryCodeHash = encodeHex(
      await sha256(new TextEncoder().encode(twoFactorRecoveryCode as string))
    );
    const [userInfo] = await db
      .select()
      .from(users)
      .where(eq(users.twoFactorRecoveryHash, twoFactorRecoveryCodeHash))
      .limit(1);
    if (!userInfo) {
      return fail(400);
    }

    await db
      .update(users)
      .set({ twoFactorSecret: null, twoFactorRecoveryHash: null })
      .where(eq(users.id, user.id));
  }
};
