export const secrets = {
  DigitalOceanToken: new sst.Secret(
    "DigitalOceanToken",
    // process.env.DIGITALOCEAN_TOKEN,
  ),
  CloudflareApiToken: new sst.Secret(
    "CloudflareApiToken",
    // process.env.CLOUDFLARE_API_TOKEN,
  ),

  MainDatabase: {
    Username: new sst.Secret(
      "MainDatabaseUsername",
      // process.env.MAIN_DATABASE_USERNAME,
    ),
    Password: new sst.Secret(
      "MainDatabasePassword",
      // process.env.MAIN_DATABASE_PASSWORD,
    ),
  },

  MainRedis: {
    Username: new sst.Secret(
      "MainRedisUsername",
      // process.env.MAIN_REDIS_USERNAME,
    ),
    Password: new sst.Secret(
      "MainRedisPassword",
      // process.env.MAIN_REDIS_PASSWORD,
    ),
  },
};
