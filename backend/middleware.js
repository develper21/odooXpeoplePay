// middleware.js (backend project root)
// Edge-compatible authentication gate for the whole app.
//
// Scope (Phase 3.9):
// - Coarse-grained ONLY: it proves the request carries a valid, unexpired
//   hrms_token JWT (signature, expiry, issuer, audience) using the existing
//   jose-based verification utility from lib/auth.js — the same logic the
//   API routes rely on.
// - It performs NO database access and NO permission evaluation: JWT claims
//   are never trusted for authorization. Business API handlers keep using
//   requirePermission() (lib/auth-guard.js) for DB-fresh, permission-key
//   authorization; future page routes will guard themselves server-side.
// - Public routes pass through untouched: the auth endpoints (login,
//   register, logout, me) manage their own session logic; static files and
//   Next.js internals never even reach this file (see `config.matcher`).
//
// Responses:
// - Unauthenticated/invalid API request → 401 { error: 'Not authenticated.' }
//   (same body as the route handlers).
// - Unauthenticated protected app page (none exist yet) → 302 redirect to
//   /login?next=<original path> once page families are registered below.

import { NextResponse } from 'next/server';

import { verifyAuthToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie';

// Auth endpoints manage their own session handling and stay public.
const PUBLIC_API_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
]);

// Application (page) route families that require a session. Empty for now —
// the app UI has not been built. Add prefixes here as pages ship, e.g.
// '/dashboard', '/employees', '/payroll'.
const PROTECTED_APP_ROUTES = [];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Public API endpoints pass straight through.
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // 2. Every other API route (current and future families) requires a valid,
  //    unexpired session token. Invalid/expired → JSON 401.
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = await verifyAuthToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 3. Protected application pages redirect anonymous users to the (future)
  //    login page, carrying the original path for a post-login bounce.
  if (
    PROTECTED_APP_ROUTES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = await verifyAuthToken(token);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Everything else (public pages like `/`) is untouched.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all request paths except Next.js internals (_next/…), the
    // favicon, and static asset files (public/). Middleware never sees them.
    '/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|mjs|map|txt|xml|json|woff|woff2|ttf|otf|eot)$).*)',
  ],
};