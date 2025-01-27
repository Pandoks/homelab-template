import { generateRandomString } from "../utils";
import { vps } from "./vps";

// TODO: Setup staging
const hash = generateRandomString(10);
const baseDomain = "ziji.dev";

// NOTE: Authn/z error is probably an API token permissions problem
var zone = cloudflare.getZoneOutput({ name: baseDomain });

new cloudflare.ZoneSettingsOverride("ZijiZoneSettings", {
  zoneId: zone.id,
  settings: {
    ssl: "full",
  },
});

const directRecordTypes = ["A", "AAAA"];
for (const recordType of directRecordTypes) {
  const ipAddress = recordType === "A" ? vps.ipv4Address : vps.ipv6Address;
  // NOTE: Once you start going multi servers, make sure this is pointing to the load balancer
  new cloudflare.Record(`VPSConnection${recordType}`, {
    zoneId: zone.id,
    name: baseDomain,
    type: recordType,
    value: ipAddress,
    proxied: true, // make sure this is true so that Cloudflare can run their middleware
  });

  new cloudflare.Record(`APIConnection${recordType}`, {
    zoneId: zone.id,
    name: `api.${baseDomain}`,
    type: recordType,
    value: ipAddress, // change this when moving api to another machine
    proxied: true,
  });
}

new cloudflare.Record("CatchAll", {
  zoneId: zone.id,
  name: `*.${baseDomain}`,
  type: "CNAME",
  value: baseDomain,
  proxied: true,
});

// NOTE: will always update on each deploy and it takes some time to realize new configs when changed
new cloudflare.Ruleset("RedirectToRoot", {
  name: "Redirect subdomains to root",
  kind: "zone",
  zoneId: zone.id,
  phase: "http_request_dynamic_redirect", // https://developers.cloudflare.com/ruleset-engine/reference/phases-list/
  rules: [
    {
      expression:
        `(http.request.full_uri wildcard "https://*.${baseDomain}*" and 
not starts_with(http.request.full_uri, "https://api.${baseDomain}"))`.replace(
          /\n/g,
          "",
        ),
      actionParameters: {
        fromValue: {
          preserveQueryString: true,
          statusCode: 301,
          targetUrl: {
            expression: `wildcard_replace(http.request.full_uri, "https://*.${baseDomain}*", "https://${baseDomain}\$\{2\}")`,
          },
        },
      },
      action: "redirect",
      enabled: true,
      description: "Redirects subdomains to root domain",
    },
  ],
});

export { zone };