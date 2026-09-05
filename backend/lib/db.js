// lib/db.js
// Server-side Drizzle ORM client for Neon PostgreSQL (via the Neon serverless HTTP driver).
//
// SERVER-ONLY:
// - `server-only` makes any client-side import of this module fail the build, so
//   DATABASE_URL can never leak into the browser bundle.
// - DATABASE_URL is read from backend/.env.local and only ever used on the server.
import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
// The HRMS schema (tables + relations). Passing it enables relational queries
// via db.query.* (e.g. db.query.payslips.findMany({ with: { contract: true } })).
import * as schema from './schema.js';

// Reuse a single client instance across dev-server hot reloads.
const globalForDb = globalThis;

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add it to backend/.env.local and make sure the env file is loaded.',
    );
  }

  // Neon serverless driver - SQL over HTTP, server-side only.
  const sql = neon(process.env.DATABASE_URL);

  // Drizzle client bound to the Neon HTTP driver.
  // `schema` enables db.query.* relational queries across the HRMS tables.
  return drizzle({ client: sql, schema });
}

export const db = globalForDb.__drizzleDb ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__drizzleDb = db;
}