/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */
import "sst"
export {}
declare module "sst" {
  export interface Resource {
    "CloudflareApiToken": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "DNS": {
      "domain": string
      "origin": string
      "protocol": string
      "type": "sst.sst.Linkable"
    }
    "DigitalOceanToken": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainDatabaseHost": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainDatabaseName": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainDatabasePassword": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainDatabasePort": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainDatabaseUsername": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainRedisPassword": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainRedisUsername": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "PublicSSHKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
  }
}
