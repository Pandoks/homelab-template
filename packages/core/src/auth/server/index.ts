import { Lucia } from "lucia";
import { encodeHex } from "oslo/encoding";
import { sha1 } from "@oslojs/crypto/sha1";
import { DatabaseAdapter } from "./adapter";
import { database } from "../../database/main";
import { Resource } from "sst";

const adapter = new DatabaseAdapter(database);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: Resource.App.stage === "production", // sets `Secure` flag in HTTPS
    },
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      email: attributes.email,
      isEmailVerified: attributes.isEmailVerified,
      hasTwoFactor: attributes.hasTwoFactor,
    };
  },
  getSessionAttributes: (attributes) => {
    return {
      isTwoFactorVerified: attributes.isTwoFactorVerified,
      isPasskeyVerified: attributes.isPasskeyVerified,
    };
  },
});

// gives lucia's module types
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
  }
}

// attributes of user for auth from the database
interface DatabaseUserAttributes {
  username: string;
  email: string;
  isEmailVerified: boolean;
  hasTwoFactor: boolean;
}

// attributes of session for a user from the database
interface DatabaseSessionAttributes {
  isTwoFactorVerified: boolean;
  isPasskeyVerified: boolean;
}

export const verifyPasswordStrength = async (password: string) => {
  const hash = encodeHex(sha1(new TextEncoder().encode(password)));
  const hashPrefix = hash.slice(0, 5);

  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${hashPrefix}`,
  );
  const data = await response.text();

  const items = data.split("\n");
  for (const item of items) {
    const hashSuffix = item.slice(0, 35).toLowerCase();
    if (hash === hashPrefix + hashSuffix) {
      return false;
    }
  }
  return true;
};
