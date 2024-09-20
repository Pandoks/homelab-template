import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
export const database = drizzle(
  postgres({
    username: Resource.MainDatabase.username,
    password: Resource.MainDatabase.password,
    host: Resource.MainDatabase.host,
    port: Resource.MainDatabase.port,
    database: Resource.MainDatabase.name,
  }),
);
