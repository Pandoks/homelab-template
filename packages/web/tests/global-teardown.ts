import type { FullConfig } from '@playwright/test';
import { resetTestDatabases } from './utils';
import { mainDatabase } from './db';
import { mainRedis } from './redis';
import type { RedisClientType } from 'redis';

export default async (config: FullConfig) => {
  await resetTestDatabases({ redis: [mainRedis as RedisClientType], db: [mainDatabase] });
};
