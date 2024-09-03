/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "CloudflareApiToken": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "DigitalOceanToken": {
      "type": "sst.sst.Secret"
      "value": string
    }
  }
}
export {}
