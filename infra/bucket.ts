if (!$dev) {
  var databaseBackupBucket = new sst.cloudflare.Bucket("DatabaseBackup");
}

export { databaseBackupBucket };
