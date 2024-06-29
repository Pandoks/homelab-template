import { defineConfig } from 'drizzle-kit';

const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_DATABASE = process.env.DB_DATABASE;

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

export default defineConfig({
	schema: './src/lib/db/schema.ts',
	dialect: 'postgresql',
	out: './drizzle',
	dbCredentials: {
		user: DB_USERNAME,
		password: DB_PASSWORD,
		host: DB_HOST,
		port: parseInt(DB_PORT),
		database: DB_DATABASE,
		ssl: false // enable ssl for production
	},
	verbose: true,
	strict: true
});
