import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DB_DATABASE, DB_HOST, DB_PASSWORD, DB_PORT, DB_USERNAME } from '$env/static/private';

if (
	!DB_DATABASE ||
	!DB_PORT ||
	!DB_HOST ||
	DB_PASSWORD === undefined ||
	DB_PASSWORD === null ||
	!DB_USERNAME
) {
	throw new Error('Database credentials is required');
}

// add {prepare: false} if using "Transaction" pool mode in Supabase (serverless hosting)
// otherwise nothing needs to be changed for "Session" (long running hosting)
const queryClient = postgres({
	username: DB_USERNAME,
	password: DB_PASSWORD,
	host: DB_HOST,
	port: parseInt(DB_PORT),
	database: DB_DATABASE
});
export const db = drizzle(queryClient);
