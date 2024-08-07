import { protect } from '$lib/auth/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  protect({ event: event });
};
