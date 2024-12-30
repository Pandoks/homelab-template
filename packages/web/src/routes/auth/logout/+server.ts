import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateSession } from '@startup-template/core/auth/server/index';
import { deleteSessionTokenCookie } from '$lib/auth/server/sessions';
import { mainDatabase } from '$lib/postgres';

export const POST: RequestHandler = async (event) => {
  const currentSession = event.locals.session;
  if (!currentSession) {
    return error(401);
  }

  await invalidateSession({ sessionId: currentSession.id, database: mainDatabase });
  deleteSessionTokenCookie(event);

  return redirect(302, '/');
};
