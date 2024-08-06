import type { RedisInstance } from '$lib/db/redis';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType, RedisClusterType } from 'redis';

export const resetTestDatabases = async ({
  db,
  redis
}: {
  db?: PostgresJsDatabase;
  redis?: RedisInstance;
}) => {
  if (!redis) {
    throw new Error('No test redis instance');
  } else if (redis.type === 'client') {
    const redisInstance = redis.instance as RedisClientType;
    await redisInstance.flushAll();
  } else {
    const redisInstance = redis.instance as RedisClusterType;
  }

  if (!db) {
    return;
  }
  const tables: { table_name: string }[] = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${table.table_name} CASCADE`));
  }
};
