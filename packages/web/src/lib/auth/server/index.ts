import type {
  DatabaseSessionAttributes,
  DatabaseUserAttributes
} from '@startup-template/core/auth/server/index';
import { error, redirect, type RequestEvent, type ServerLoadEvent } from '@sveltejs/kit';

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
  allowUserAttributes,
  allowSessionAttributes
}: {
  event: ServerLoadEvent | RequestEvent;
  allowUserAttributes?: DatabaseUserAttributes[];
  allowSessionAttributes?: DatabaseSessionAttributes[];
}): void => {
  handleAlreadyLoggedIn(event);
  const user = event.locals.user;
  const session = event.locals.session;
  if (!user || !session) {
    return redirect(302, '/auth/login');
  }

  if (allowUserAttributes) {
    const stringifiedAllowUserAttributes = allowUserAttributes.map((userAttribute) =>
      JSON.stringify(userAttribute)
    );
    if (!stringifiedAllowUserAttributes.includes(JSON.stringify(user))) {
      return error(401);
    }
  }

  if (allowSessionAttributes) {
    const stringifyAllowSessionAttributes = allowSessionAttributes.map((sessionAttribute) =>
      JSON.stringify(sessionAttribute)
    );

    if (!stringifyAllowSessionAttributes.includes(JSON.stringify(session))) {
      return error(401);
    }
  }
};
