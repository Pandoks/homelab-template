// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { Lucia } from 'lucia';

declare global {
	namespace App {
		// interface Error {}
		// give types to event.locals
		interface Locals {
			user: Lucia.User;
			session: Lucia.Session;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
