// Middleware
import { deleteSessionTokenCookie, setSessionTokenCookie } from '$lib/auth/server/sessions';
import { validateSessionToken } from '@startup-template/core/auth/server/index';
import { error, json, text, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

/**
 * Paths that don't have CSRF protection
 *  When making requests to these paths, store the sessiond ID in localstorage and send it over
 *  as a bearer token:
 *  fetch('https://api/example.com', {
 *    headers: {
 *      Authorization: `Bearer ${sessionId}`
 *    }
 *  })
 */
const nakedPaths: string[] = [];

// Gets auth information of a user accessing the website
const luciaAuth: Handle = async ({ event, resolve }) => {
  let sessionToken = null;
  if (nakedPaths.includes(event.url.pathname)) {
    const token = event.request.headers.get('Authorization')?.split(' '); // bearer token
    sessionToken = token && token[0] === 'Bearer' ? token[1] : null;
  } else {
    sessionToken = event.cookies.get('session'); // cookies
  }

  if (!sessionToken) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await validateSessionToken(sessionToken);
  if (session) {
    setSessionTokenCookie({ event, sessionToken, expiresAt: session.expiresAt });
  } else {
    deleteSessionTokenCookie(event);
  }

  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
};

/**
 * CSRF protection copied from sveltekit but with the ability to turn it off for specific routes.
 * Checks if requests are coming from the same origin as the server (basically cors)
 */
const csrf: Handle = async ({ event, resolve }) => {
  const requestType = event.request.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
  const forbiddenRequestTypes = ['application/x-www-form-url-urlencoded', 'multipart/form-data'];

  const forbidden =
    event.request.method === 'POST' &&
    event.request.headers.get('origin') !== event.url.origin &&
    forbiddenRequestTypes.includes(requestType) &&
    !nakedPaths.includes(event.url.pathname);

  if (forbidden) {
    const csrfError = error(
      403,
      `Cross-site ${event.request.method} form submissions are forbidden`
    );
    if (event.request.headers.get('accept') === 'application/json') {
      // @ts-ignore
      return json(csrfError.body, { status: csrfError.status });
    }
    // @ts-ignore
    return text(csrfError.body.message, { status: csrfError.status });
  }

  return resolve(event);
};

// NOTE: DON'T protect your routes in middleware. Leave auth to layouts or a per page basis

export const handle: Handle = sequence(csrf, luciaAuth);
