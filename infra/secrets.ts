const secrets = {
  DigitalOceanToken: new sst.Secret(
    "DigitalOceanToken",
    process.env.DIGITALOCEAN_TOKEN,
  ),
  CloudflareApiToken: new sst.Secret(
    "CloudflareApiToken",
    process.env.CLOUDFLARE_API_TOKEN,
  ),
};
