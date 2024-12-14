export const secrets = {
  HetznerToken: new sst.Secret("HetznerToken"),
  CloudflareApiToken: new sst.Secret("CloudflareApiToken"),

  PublicSSHKey: new sst.Secret("PublicSSHKey"),

  GhToken: new sst.Secret("GhToken"),

  MainDatabase: {
    Username: new sst.Secret("MainDbAdminUser"),
    Password: new sst.Secret("MainDbAdminPass"),
    Database: new sst.Secret("MainDbName"),
    Url: new sst.Secret("MainDbUrl"),
  },

  MainRedis: {
    Password: new sst.Secret("MainRedisPass"),
    Url: new sst.Secret("MainRedisUrl"),
  },
};
