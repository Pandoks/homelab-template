export const secrets = {
  DigitalOceanToken: new sst.Secret("DigitalOceanToken"),
  CloudflareApiToken: new sst.Secret("CloudflareApiToken"),

  MainDatabase: {
    Username: new sst.Secret("MainDatabaseUsername"),
    Password: new sst.Secret("MainDatabasePassword"),
  },

  MainRedis: {
    Username: new sst.Secret("MainRedisUsername"),
    Password: new sst.Secret("MainRedisPassword"),
  },
};
