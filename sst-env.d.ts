/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "Site": {
      "type": "sst.aws.SvelteKit"
      "url": string
    }
    "UserBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
  }
}
export {}
