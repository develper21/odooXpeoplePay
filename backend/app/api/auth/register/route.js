// app/api/auth/register/route.js — RETIRED (Phase 3 alignment).
//
// Public self-registration allowed anyone to create accounts and choose
// privileged roles, which does not fit an HRMS: application users are now
// created exclusively by an authenticated administrator via POST /api/users
// (see app/api/users/route.js).
//
// The endpoint is kept as a tombstone so API clients get a deliberate,
// documented response instead of a bare 404:
//   POST|GET /api/auth/register → 410 Gone (all other methods → 405).
// It remains in the middleware's public list, so the retirement is visible
// even without a session.

import { NextResponse } from 'next/server';

const RETIRED_RESPONSE = {
  error:
    'Self-registration is disabled. User accounts are created by an administrator via POST /api/users.',
};

function gone() {
  return NextResponse.json(RETIRED_RESPONSE, { status: 410 });
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}