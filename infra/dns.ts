import { alphabet, generateRandomString } from "oslo/crypto";

const hash = generateRandomString(10, alphabet("a-z", "0-9"));
const base = "";

export const domain = {
  production: base,
  staging: `staging-${hash}.${base}`,
}[$app.stage];

// export const zone = cloudflare.getZoneOutput({ name: base });
