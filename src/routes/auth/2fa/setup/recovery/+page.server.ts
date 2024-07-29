import { generateIdFromEntropySize, type User } from 'lucia';
import type { Actions, PageServerLoad } from './$types';
import { handleAlreadyLoggedIn, lucia } from '$lib/auth/server';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';
import { db } from '$lib/db/postgres';
import { users } from '$lib/db/postgres/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const ssr = false;

export const actions: Actions = {
  'activate-2fa': async (event) => {
    const user = event.locals.user;
    if (!user) {
      return redirect(302, '/auth/login');
    }

    db.update(users)
      .set({ hasTwoFactor: true })
      .where(eq(users.id, user.id))
      .catch((error) => console.error(error));

    const session = await lucia.createSession(user.id, {
      isTwoFactorVerified: true,
      isPasskeyVerified: false
    });
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });

    return redirect(302, '/');
  },
  'generate-new': async (event) => {
    const user = event.locals.user;
    if (!user) {
      return redirect(302, '/auth/login');
    }

    const twoFactorRecoveryCode = generateIdFromEntropySize(25); // 40 characters
    const twoFactorRecoveryCodeHashBuffer = sha256(new TextEncoder().encode(twoFactorRecoveryCode));

    updateDatabase({
      twoFactorRecoveryCodeHashBuffer: twoFactorRecoveryCodeHashBuffer,
      user: user
    });

    return {
      twoFactorRecoveryCode: twoFactorRecoveryCode
    };
  }
};

export const load: PageServerLoad = async (event) => {
  handleAlreadyLoggedIn(event);
  const user = event.locals.user;
  if (!user) {
    return redirect(302, '/auth/login');
  } else if (event.locals.session?.isTwoFactorVerified) {
    return redirect(302, '/');
  }

  const [userInfo] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (userInfo.twoFactorRecoveryHash) {
    return {
      twoFactorRecoveryCode: null
    };
  }

  const twoFactorRecoveryCode = generateIdFromEntropySize(25); // 40 characters
  const twoFactorRecoveryCodeHashBuffer = sha256(new TextEncoder().encode(twoFactorRecoveryCode));

  updateDatabase({
    twoFactorRecoveryCodeHashBuffer: twoFactorRecoveryCodeHashBuffer,
    user: user
  });

  return {
    twoFactorRecoveryCode: twoFactorRecoveryCode
  };
};

const updateDatabase = async ({
  twoFactorRecoveryCodeHashBuffer,
  user
}: {
  twoFactorRecoveryCodeHashBuffer: Promise<ArrayBuffer>;
  user: User;
}) => {
  const twoFactorRecoveryCodeHash = encodeHex(await twoFactorRecoveryCodeHashBuffer);
  await db
    .update(users)
    .set({ twoFactorRecoveryHash: twoFactorRecoveryCodeHash })
    .where(eq(users.id, user!.id));
};
