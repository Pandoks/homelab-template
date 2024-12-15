export const secrets = {
  HetznerToken: new sst.Secret("HetznerToken"),
  CloudflareApiToken: new sst.Secret("CloudflareApiToken"),
  GhToken: new sst.Secret("GhToken"),

  PublicSSHKey: new sst.Secret("PublicSSHKey"),

  MainDatabase: {
    AdminUser: new sst.Secret("MainDbAdminUser"),
    AdminPass: new sst.Secret("MainDbAdminPass"),
    Database: new sst.Secret("MainDbName"),
    RepPass: new sst.Secret("MainDbRepPass"),
    PoolPass: new sst.Secret("MainDbPoolPass"),
    Url: new sst.Secret("MainDbUrl"),
  },

  MainRedis: {
    Password: new sst.Secret("MainRedisPass"),
    Url: new sst.Secret("MainRedisUrl"),
  },
};
