import { alphabet, generateRandomString } from "oslo/crypto";

const hash = generateRandomString(10, alphabet("a-z", "0-9"));
const base = "";

export const domain =
  {
    production: base,
    staging: `staging-${hash}.${base}`,
  }[$app.stage] || "localhost";

const protocol = ["production", "staging"].includes($app.stage)
  ? "https"
  : "http";

const origin = `${protocol}://${domain}${["production", "staging"].includes($app.stage) ? "" : ":3000"}`;

// export const zone = cloudflare.getZoneOutput({ name: base });

new sst.Linkable("DNS", {
  properties: {
    domain: domain,
    protocol: protocol,
    origin: origin,
  },
});
