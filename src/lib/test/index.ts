import type { RedisInstance } from '$lib/db/redis';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType, RedisClusterType } from 'redis';

export const resetTestDatabases = async ({
  dbs,
  redises
}: {
  dbs?: { [id: string]: PostgresJsDatabase };
  redises?: { [id: string]: RedisInstance };
}) => {
  let cemetary: Promise<any>[] = [];

  const redisIds = redises ? Object.keys(redises) : [];
  const dbIds = dbs ? Object.keys(dbs) : [];

  for (const redisId of redisIds) {
    const redis = redises![redisId];
    if (redis.type === 'client') {
      const redisInstance = redis.instance as RedisClientType;
      cemetary.push(redisInstance.flushAll());
    } else if (redis.type === 'cluster') {
      const redisInstance = redis.instance as RedisClusterType;
      const masterNodes = redisInstance.masters;
      // gotta use a boomer loop because masterNodes' iterator returns strings
      for (let i = 0; i < masterNodes.length; i++) {
        const masterNode = masterNodes[i];
        const nodeClient = redisInstance.nodeClient(masterNode) as RedisClientType;
        cemetary.push(nodeClient.flushAll());
      }
    }
  }

  for (const dbId of dbIds) {
    const db = dbs![dbId];
    const tables: { table_name: string }[] =
      (await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `)) || [];
    for (const table of tables) {
      cemetary.push(db!.execute(sql.raw(`TRUNCATE TABLE ${table.table_name} CASCADE`)));
    }
  }

  await Promise.all(cemetary);
};
