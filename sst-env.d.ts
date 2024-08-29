/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "UserBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
  }
}
export {}
