import { lucia } from '$lib/server/auth';
import { redirect, type ServerLoadEvent } from '@sveltejs/kit';

export const validateAuthRequest = async ({ event }: { event: ServerLoadEvent }): Promise<void> => {
  const existingSession = event.locals.session;

  if (existingSession) {
    // user is already logged in
    const { session, user } = await lucia.validateSession(existingSession.id);
    if (!session) {
      // reset current cookie/session
      const sessionCookie = lucia.createBlankSessionCookie();
      event.cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } else if (!session.isTwoFactorVerified && user.isTwoFactor) {
      return redirect(302, '/auth/2fa/otp');
    } else {
      return redirect(302, '/');
    }
  }
};
