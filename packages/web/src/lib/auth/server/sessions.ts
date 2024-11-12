import type { RequestEvent } from '@sveltejs/kit';

export const setSessionTokenCookie = ({
  event,
  sessionToken,
  expiresAt
}: {
  event: RequestEvent;
  sessionToken: string;
  expiresAt: Date;
}): void => {
  event.cookies.set('session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  });
};

export const deleteSessionTokenCookie = (event: RequestEvent): void => {
  event.cookies.set('session', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
};
