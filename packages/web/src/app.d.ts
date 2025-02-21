// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { User } from '@homelab-template/postgres/main/user.sql';
import type { Session } from '@homelab-template/postgres/main/auth.sql';

declare global {
  namespace App {
    // interface Error {}
    // give types to event.locals
    interface Locals {
      user: User | null;
      session: Session | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
