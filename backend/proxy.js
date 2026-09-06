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

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // 1. Public API endpoints pass straight through.
  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // 2. Every other API route requires a valid, unexpired session token. Invalid/expired -> JSON 401.
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = await verifyAuthToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 3. Protected application pages redirect anonymous users to login.
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

  // 4. Everything else passes through.
  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|mjs|map|txt|xml|json|woff|woff2|ttf|otf|eot)$).*)',
  ],
};
