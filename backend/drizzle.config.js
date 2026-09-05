// drizzle.config.js
// Configuration for the drizzle-kit CLI (generate / push / pull / studio).
import { defineConfig } from 'drizzle-kit';

// Load DATABASE_URL from backend/.env.local (Node >= 20.12 built-in).
// This keeps the connection string out of this file and out of any client bundle.
// Externally-provided environments (e.g. production CI) already set DATABASE_URL,
// in which case the local file is left untouched.
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env.local');
}

export default defineConfig({
  dialect: 'postgresql', // Neon PostgreSQL
  schema: './lib/schema.js', // Drizzle schema definitions live in lib/
  out: './drizzle', // Generated migration files are written to drizzle/
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});