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
    Shards: [
      {
        Master: {
          Cert: new sst.Secret("MainDbMasterCert"),
          Key: new sst.Secret("MainDbMasterKey"),
        },
        Slaves: {
          Slave1: {
            Certificate: new sst.Secret("MainDbSlave1Cert"),
            Key: new sst.Secret("MainDbSlave1Key"),
          },
        },
      },
    ],
  },

  PgBackrest: {
    Cert: new sst.Secret("PgBackrestCert"),
    Key: new sst.Secret("PgBackrestKey"),
  },

  CertifiedAuthority: {
    // If you change the names of these secrets, remember to change the generate_ca.sh script
    Cert: new sst.Secret("CACert"),
    Key: new sst.Secret("CAKey"),
    Serial: new sst.Secret("CASerial"),
  },

  MainRedis: {
    Password: new sst.Secret("MainRedisPass"),
    Url: new sst.Secret("MainRedisUrl"),
  },
};
