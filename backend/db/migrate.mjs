// db/migrate.mjs
// Applies pending SQL migrations from ./drizzle using the Neon HTTP driver.
// (drizzle-kit's CLI `migrate` is unreliable against @neondatabase/serverless,
// so `npm run db:migrate` routes through this programmatic migrator instead.)
//
// Run from backend/:   npm run db:migrate

import { loadEnvFile } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '../.env.local');
if (fs.existsSync(envPath)) loadEnvFile(envPath);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (expected in backend/.env.local).');
  process.exit(1);
}

const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(migrationClient);
await migrate(db, { migrationsFolder: path.resolve(here, '../drizzle') });
await migrationClient.end();
console.log('Migrations applied ✔');
