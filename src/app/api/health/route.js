import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const host = hasDbUrl ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] : null;
  const hasJwt = Boolean(process.env.JWT_SECRET);
  const jwtLen = process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0;

  let dbStatus = 'disconnected';
  let dbError = null;
  let userCount = null;

  try {
    const res = await db.execute(sql`SELECT count(*) as count FROM users`);
    dbStatus = 'connected';
    userCount = res[0]?.count ?? null;
  } catch (err) {
    dbStatus = 'error';
    dbError = err?.message || String(err);
  }

  const isHealthy = dbStatus === 'connected' && hasJwt && jwtLen >= 32;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database_url_configured: hasDbUrl,
        database_host: host,
        database_connection: dbStatus,
        database_error: dbError,
        database_users_count: userCount,
        jwt_secret_configured: hasJwt,
        jwt_secret_valid_length: jwtLen >= 32,
      },
    },
    { status: isHealthy ? 200 : 500 },
  );
}
