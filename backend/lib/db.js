// Server-side Drizzle ORM client for PostgreSQL (using postgres-js driver).
//
// SERVER-ONLY:
// - `server-only` makes any client-side import of this module fail the build, so
//   DATABASE_URL can never leak into the browser bundle.
// - DATABASE_URL is read from backend/.env.local and only ever used on the server.
import 'server-only';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
// The HRMS schema (tables + relations). Passing it enables relational queries
// via db.query.* (e.g. db.query.payslips.findMany({ with: { contract: true } })).
import * as schema from './schema.js';

// Reuse a single client instance across dev-server hot reloads.
const globalForDb = globalThis;

let _db = null;

function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add it to backend/.env.local and make sure the env file is loaded.',
    );
  }

  // PostgreSQL client for local PostgreSQL / pgAdmin
  const client = postgres(process.env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Drizzle client bound to postgres-js
  // `schema` enables db.query.* relational queries across the HRMS tables.
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy(
  {},
  {
    get(target, prop) {
      const instance = globalForDb.__drizzleDb ?? getDb();
      if (process.env.NODE_ENV !== 'production') {
        globalForDb.__drizzleDb = instance;
      }
      return instance[prop];
    },
  },
);