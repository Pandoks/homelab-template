export const secrets = {
  HetznerToken: new sst.Secret("HetznerToken"),
  CloudflareApiToken: new sst.Secret("CloudflareApiToken"),

  PublicSSHKey: new sst.Secret("PublicSSHKey"),

  MainDatabase: {
    AdminUser: new sst.Secret("MainDbAdminUser", "admin"),
    AdminPass: new sst.Secret("MainDbAdminPass", "password"),
    Database: new sst.Secret("MainDbName", "main"),
    RepPass: new sst.Secret("MainDbRepPass", "password"),
    PoolPass: new sst.Secret("MainDbPoolPass", "password"),
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
