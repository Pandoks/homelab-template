import { redirect, type RequestEvent, type ServerLoadEvent } from '@sveltejs/kit';

/**
 * Used to check the validation of user login preferences. Ie. if the user is already logged in but
 * they haven't verified 2FA even though they have 2FA enabled
 *
 * @params event Sveltekit's ServerLoadEvent or RequestEvent
 * @returns void It handles redirects for you
 */
export const handleAlreadyLoggedIn = (event: ServerLoadEvent | RequestEvent): void => {
  const session = event.locals.session;
  const user = event.locals.user;
  if (session && user) {
    if (user.hasTwoFactor && !session.isTwoFactorVerified && !session.isPasskeyVerified) {
      return redirect(302, '/auth/2fa/otp');
    } else if (!user.isEmailVerified) {
      return redirect(302, '/auth/email-verification');
    }
  }
};

export const protect = ({
  event,
  role
}: {
  event: ServerLoadEvent | RequestEvent;
  role?: string;
}): boolean => {
  handleAlreadyLoggedIn(event);
  const user = event.locals.user;
  if (!user) {
    return redirect(302, '/auth/login');
  }

  if (role && user.role !== role) {
    return false;
  }

  return true;
};
