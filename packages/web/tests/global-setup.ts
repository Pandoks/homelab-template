import type { FullConfig } from '@playwright/test';
import { resetTestDatabases } from './utils';
import { mainRedis } from './redis';
import { mainDb } from './db';
import type { RedisClientType } from 'redis';

export default async (config: FullConfig) => {
  await resetTestDatabases({ redis: [mainRedis as RedisClientType], db: [mainDb] });
};
