export const secrets = {
  HetznerToken: new sst.Secret("HetznerToken"),
  CloudflareApiToken: new sst.Secret("CloudflareApiToken"),

  PublicSSHKey: new sst.Secret("PublicSSHKey"),

  GhToken: new sst.Secret("GhToken"),

  MainDatabase: {
    Username: new sst.Secret("MainDatabaseUsername"),
    Password: new sst.Secret("MainDatabasePassword"),
    Host: new sst.Secret("MainDatabaseHost"),
    Port: new sst.Secret("MainDatabasePort"),
    Database: new sst.Secret("MainDatabaseName"),
  },

  MainRedis: {
    Password: new sst.Secret("MainRedisPassword"),
  },
};
