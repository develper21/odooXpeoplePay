// lib/auth-cookie.js
// Shared cookie transport configuration for the JWT session token.
//
// Both POST /api/auth/login (sets the cookie) and POST /api/auth/logout
// (clears it) import from here, so the two always agree on the cookie's name
// and attributes — browsers only overwrite/delete a cookie when name, path
// and domain match the original Set-Cookie.
//
// The cookie is httpOnly: the JWT is never readable from client-side
// JavaScript (document.cookie), so an XSS cannot exfiltrate the session
// token. JWT signing and verification remain in lib/auth.js — unchanged in
// this phase.

import 'server-only';

export const AUTH_COOKIE_NAME = 'hrms_token';
export const AUTH_COOKIE_PATH = '/';

// Attributes shared by the "set" (login) and "clear" (logout) operations:
// - httpOnly: true            → token invisible to client-side JavaScript.
// - secure: production only   → HTTPS-only in prod, while plain HTTP still
//                               works against the local dev server.
// - sameSite: 'strict'        → strongest CSRF posture; the cookie rides only
//                               same-site requests. Switch to 'lax' later if
//                               cross-site top-level navigation needs it.
export function authCookieBaseAttributes() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: AUTH_COOKIE_PATH,
  };
}

// Maps a jose-style duration ('30m', '12h', '7d') to a cookie Max-Age in
// seconds, keeping the cookie lifetime in sync with the JWT's exp claim
// (JWT_EXPIRES_IN in backend/.env.local; same '7d' default as lib/auth.js).
const DURATION_UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };
const DEFAULT_MAX_AGE_SECONDS = 604800; // '7d'

export function authCookieMaxAgeSeconds() {
  const match = /^(\d+)([smhd])$/i.exec(process.env.JWT_EXPIRES_IN ?? '');
  if (!match) return DEFAULT_MAX_AGE_SECONDS;
  return Number(match[1]) * DURATION_UNIT_SECONDS[match[2].toLowerCase()];
}