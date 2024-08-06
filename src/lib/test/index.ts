import { db } from '$lib/db/postgres';
import { redis } from '$lib/db/redis';
import { sql } from 'drizzle-orm';

export const resetTestDatabases = async () => {
  if (!redis.test) {
    throw new Error('No test redis instance');
  }
  await redis.test.flushAll();

  const tables: { table_name: string }[] = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${table.table_name} CASCADE`));
  }
};
