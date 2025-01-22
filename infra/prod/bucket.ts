const uswest1 = new aws.Provider("uswest1", { region: "us-west-1" });
// We're using aws because pgbackrest support for cloudflare r2 is buggy
var databaseBackupBucket = new sst.aws.Bucket(
  "DatabaseBackupBucket",
  undefined,
  { provider: uswest1 },
);

export { databaseBackupBucket };
