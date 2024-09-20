/* tslint:disable */
/* eslint-disable */
import "sst"
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
    "MainDatabase": {
      "host": string
      "name": string
      "password": string
      "port": number
      "type": "sst.sst.Linkable"
      "username": string
    }
    "MainDatabasePassword": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainDatabaseUsername": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainRedis": {
      "host": string
      "password": string
      "port": number
      "type": "sst.sst.Linkable"
      "username": string
    }
    "MainRedisPassword": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "MainRedisUsername": {
      "type": "sst.sst.Secret"
      "value": string
    }
  }
}
export {}
