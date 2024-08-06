import type { RedisClusterType } from '@redis/client';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType } from 'redis';

// const flushRedis = (redis: RedisClientType | RedisClusterType) => {
//   if (redis is RedisClientType)
// }

// export const resetTestDatabases = async ({
//   db,
//   redis
// }: {
//   db?: PostgresJsDatabase;
//   redis?: RedisClientType | RedisClusterType;
// }) => {
//   if (!redis) {
//     throw new Error('No test redis instance');
//   }
//   await redis.flushAll();
//
//   const tables: { table_name: string }[] = await db.execute(sql`
//     SELECT table_name
//     FROM information_schema.tables
//     WHERE table_schema = 'public'
//   `);
//   for (const table of tables) {
//     await db.execute(sql.raw(`TRUNCATE TABLE ${table.table_name} CASCADE`));
//   }
// };
