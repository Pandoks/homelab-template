import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
  const session = event.locals.session;
  if (!session) {
    return new Response(null, { status: 401 });
  }
};
