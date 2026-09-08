import { defineConfig } from 'drizzle-kit';

const envFileName = process.env.ENV_FILE || '.env.local';
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envFileName);
  } catch {
    // If env file does not exist, fallback to environment
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
