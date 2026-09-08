import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // If .env.local does not exist, fallback to environment
  }
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/schema.js',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
