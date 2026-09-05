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

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '../.env.local');
if (fs.existsSync(envPath)) loadEnvFile(envPath);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (expected in backend/.env.local).');
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });
await migrate(db, { migrationsFolder: path.resolve(here, '../drizzle') });
console.log('Migrations applied ✔');
