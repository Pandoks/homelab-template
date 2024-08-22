import { domain } from "./dns";

export const web = new sst.aws.SvelteKit("Site", {
  domain: {
    name: `www.${domain}`,
    dns: sst.cloudflare.dns(),
  },
  path: "./packages/web", // relative to root, not this file
});

export const outputs = {
  web: web.url,
};