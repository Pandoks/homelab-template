import { domain } from "./dns";

/** Files that are specifically correlated with users */
export const userBucket = new sst.aws.Bucket("UserBucket", {
  cors: { allowOrigins: [`https://www.${domain}`] },
});

export const userBucketOutputs = {
  bucket: userBucket.name,
};
