

import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, authCookieBaseAttributes } from '@/lib/auth-cookie';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    ...authCookieBaseAttributes(),
    maxAge: 0,
  });
  return response;
}