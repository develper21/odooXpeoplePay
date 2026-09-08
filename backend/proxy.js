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

const PROTECTED_APP_ROUTES = [];

function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;

  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const isAllowed =
    !origin ||
    allowedOrigins.length === 0 ||
    allowedOrigins.includes('*') ||
    allowedOrigins.includes(origin);

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

function applyCors(response, corsHeaders) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const corsHeaders = getCorsHeaders(request);

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // 1. Public API endpoints pass straight through.
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return applyCors(NextResponse.next(), corsHeaders);
  }

  // 2. Every other API route requires a valid, unexpired session token. Invalid/expired -> JSON 401.
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value || bearerToken;

    const session = await verifyAuthToken(token);
    if (!session) {
      return applyCors(
        NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
        corsHeaders,
      );
    }
    return applyCors(NextResponse.next(), corsHeaders);
  }

  // 3. Protected application pages redirect anonymous users to login.
  if (
    PROTECTED_APP_ROUTES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value || bearerToken;

    const session = await verifyAuthToken(token);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Everything else passes through.
  return applyCors(NextResponse.next(), corsHeaders);
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|mjs|map|txt|xml|json|woff|woff2|ttf|otf|eot)$).*)',
  ],
};
