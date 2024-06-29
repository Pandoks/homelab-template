import { lucia } from '$lib/server/auth';
import { error, json, text, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const luciaAuth: Handle = async ({ event, resolve }) => {
	const nakedPath = nakedPaths.includes(event.url.pathname);
	const sessionId = nakedPath
		? lucia.readBearerToken(event.request.headers.get('Authorization') ?? '') // bearer token
		: event.cookies.get(lucia.sessionCookieName); // cookies

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
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

/** Paths that don't have CSRF protection
 *  When making requests to these paths, store the sessiond ID in localstorage and send it over
 *  as a bearer token:
 *  fetch('https://api/example.com', {
 *    headers: {
 *      Authorization: `Bearer ${sessionId}`
 *    }
 *  })
 */
const nakedPaths: string[] = [];

export const handle: Handle = sequence(csrf, luciaAuth);
