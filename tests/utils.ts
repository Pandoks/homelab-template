import { redis, type RedisInstance } from './redis';
import { db } from './db';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType, RedisClusterType } from 'redis';

export const resetTestDatabases = async () => {
  let cemetary: Promise<any>[] = [];

  const redisIds = Object.keys(redis);
  const dbIds = Object.keys(db);

  for (const redisId of redisIds) {
    const redisInstance = (redis as { [id: string]: RedisInstance })[redisId];
    if (redisInstance.type === 'client') {
      const redisClient = redisInstance.instance as RedisClientType;
      cemetary.push(redisClient.flushAll());
    } else if (redisInstance.type === 'cluster') {
      const redisCluster = redisInstance.instance as RedisClusterType;
      const masterNodes = redisCluster.masters;
      // gotta use a boomer loop because masterNodes' iterator returns strings
      for (let i = 0; i < masterNodes.length; i++) {
        const masterNode = masterNodes[i];
        const nodeClient = redisCluster.nodeClient(masterNode) as RedisClientType;
        cemetary.push(nodeClient.flushAll());
      }
    }
  }

  for (const dbId of dbIds) {
    const dbInstance = (db as { [id: string]: PostgresJsDatabase })[dbId];
    const tables: { table_name: string }[] =
      (await dbInstance.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `)) || [];
    for (const table of tables) {
      cemetary.push(dbInstance!.execute(sql.raw(`TRUNCATE TABLE ${table.table_name} CASCADE`)));
    }
  }

  await Promise.all(cemetary);
};
