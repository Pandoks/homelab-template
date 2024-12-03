import { generateRandomString } from "./utils";
import { vps } from "./vps";

const hash = generateRandomString(10);
const base = "ziji.dev";

export const domain =
  {
    production: base,
    staging: `staging-${hash}.${base}`,
  }[$app.stage] || "localhost";

export const zone = cloudflare.getZoneOutput({ name: base });

// NOTE: Once you start going multi servers, make sure this is pointing to the load balancer
const dnsVPSRecord = new cloudflare.Record("VPSConnection", {
  zoneId: zone.id,
  name: base,
  type: "A",
  value: vps.ipv4Address,
  proxied: true, // if proxied is true, you don't really need to set TTL cause cloudflare takes care of it
});

const wwwDnsRecord = new cloudflare.Record("wwwDnsRecord", {
  zoneId: zone.id,
  name: `www.${base}`,
  type: "A", // could be CNAME too but cloudflare flattens the records on their end so it don't matter
  value: vps.ipv4Address,
  proxied: true,
});
