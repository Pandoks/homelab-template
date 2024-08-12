import { type RedisInstance } from './redis';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RedisClientType, RedisClusterType } from 'redis';
import { emails, users } from '$lib/db/postgres/schema';
import { hash } from '@node-rs/argon2';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Browser } from '@playwright/test';
import postgres from 'postgres';
import dotenv from 'dotenv';

const { parsed: env } = dotenv.config({ path: `.env.test` });
if (!env) throw new Error('Need .env.test');

export const resetTestDatabases = async ({
  redis,
  db
}: {
  redis: { [key: string]: RedisInstance };
  db: { [key: string]: PostgresJsDatabase };
}) => {
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

// Literally the password hash for 'password' lol
const PASSWORD_HASH = await hash('password', {
  // recommended minimum parameters
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
});
export const createNewUser = async ({
  username,
  email,
  emailVerified
}: {
  username: string;
  email: string;
  emailVerified: boolean;
}) => {
  await db.main.transaction(async (tsx) => {
    await tsx.insert(users).values({
      id: username,
      username: username,
      passwordHash: PASSWORD_HASH
    });
    await tsx.insert(emails).values({
      email: email,
      isVerified: emailVerified,
      userId: username
    });
  });
};

export const backupTestDatabase = ({
  username,
  host,
  port,
  database,
  backupFile
}: {
  username: string;
  host: string;
  port: string;
  database: string;
  backupFile: string;
}) => {
  const dir = dirname(backupFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const dbDumpCommand = `pg_dump -U ${username} -h ${host} -p ${port} -F c -b -f ${backupFile} ${database} `;
  execSync(dbDumpCommand);
};

export const restoreDatabase = ({
  username,
  host,
  port,
  database,
  dumpFile
}: {
  username: string;
  host: string;
  port: string;
  database: string;
  dumpFile: string;
}) => {
  const dir = dirname(dumpFile);
  if (!existsSync(dir)) {
    throw new Error('File does not exist');
  }

  const dbRestoreCommand = `pg_restore -U ${username} -h ${host} -p ${port} -d ${database} --clean ${dumpFile}`;
  execSync(dbRestoreCommand);
};

export const allLoggedInGoto = async ({ browser, url }: { browser: Browser; url: string }) => {
  const [partialPasswordContext, fullPasswordContext, partialPasskeyContext, fullPasskeyContext] =
    await Promise.all([
      browser.newContext({
        storageState: 'playwright/.states/password-partial-signup.json'
      }),
      browser.newContext({
        storageState: 'playwright/.states/password-full-signup.json'
      }),
      browser.newContext({
        storageState: 'playwright/.states/passkey-partial-signup.json'
      }),
      browser.newContext({
        storageState: 'playwright/.states/passkey-full-signup.json'
      })
    ]);
  const [partialPasswordPage, fullPasswordPage, partialPasskeyPage, fullPasskeyPage] =
    await Promise.all([
      partialPasswordContext.newPage(),
      fullPasswordContext.newPage(),
      partialPasskeyContext.newPage(),
      fullPasskeyContext.newPage()
    ]);
  await Promise.all([
    partialPasswordPage.goto(url),
    fullPasswordPage.goto(url),
    partialPasskeyPage.goto(url),
    fullPasskeyPage.goto(url)
  ]);

  return {
    partialPasswordPage,
    fullPasswordPage,
    partialPasskeyPage,
    fullPasskeyPage
  };
};

export const createDatabase = ({
  username,
  host,
  port,
  name
}: {
  username: string;
  host: string;
  port: string;
  name: string;
}) => {
  const existCommand = `psql -lqt | cut -d \\\| -f 1 \| grep ${name} | xargs echo`;
  const exists = execSync(existCommand, {
    encoding: 'utf-8'
  });
  if (exists.trim() !== '') {
    return drizzle(
      postgres({
        username: env.USER_DB_USERNAME,
        password: env.USER_DB_PASSWORD,
        host: env.USER_DB_HOST,
        port: parseInt(env.USER_DB_PORT),
        database: name,
        onnotice: () => {}
      })
    );
  }

  const dbCreateCommand = `createdb -U ${username} -h ${host} -p ${port} ${name}`;
  execSync(dbCreateCommand);
  return drizzle(
    postgres({
      username: env.USER_DB_USERNAME,
      password: env.USER_DB_PASSWORD,
      host: env.USER_DB_HOST,
      port: parseInt(env.USER_DB_PORT),
      database: name,
      onnotice: () => {}
    })
  );
};

export const deleteDatabase = ({
  username,
  host,
  port,
  name
}: {
  username: string;
  host: string;
  port: string;
  name: string;
}) => {
  const existCommand = `psql -lqt | cut -d \\\| -f 1 \| grep ${name} | xargs echo`;
  const exists = execSync(existCommand, {
    encoding: 'utf-8'
  });
  if (exists.trim() === '') {
    return;
  }

  const dbDeleteCommand = `dropdb -U ${username} -h ${host} -p ${port} ${name} --force`;
  execSync(dbDeleteCommand);
};
