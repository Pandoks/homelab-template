import type { FullConfig } from '@playwright/test';
import { resetTestDatabases } from './utils';
import { redis, type RedisInstance } from './redis';
import { db } from './db';

export default async (config: FullConfig) => {
  await resetTestDatabases({ redis: redis as { [key: string]: RedisInstance }, db: db });
};
