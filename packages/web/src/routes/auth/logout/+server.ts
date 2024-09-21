import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '@startup-template/core/auth/server/index';

export const POST: RequestHandler = async (event) => {
  const currentSession = event.locals.session;
  if (!currentSession) {
    return error(401);
  }

  await lucia.invalidateSession(currentSession.id);
  const sessionCookie = lucia.createBlankSessionCookie();
  event.cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '/',
    ...sessionCookie.attributes
  });

  return redirect(302, '/');
};
