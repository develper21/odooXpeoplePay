// lib/auth.js
// Server-only auth primitives:
// - JWT signing & verification built on `jose` (HS256).
// - Password hashing built on `bcryptjs` (salted & slow — never SHA-256).
//
// SERVER-ONLY:
// - `server-only` makes any client-side import of this module fail the build,
//   so JWT_SECRET can never leak into the browser bundle.
// - JWT_SECRET / JWT_EXPIRES_IN are read from backend/.env.local (server only),
//   exactly like DATABASE_URL in lib/db.js.
//
// Payload convention (the login route in a later phase fills these in):
//   { sub: '<user id>', email, role: '<role code>', permissions: ['*'|'module:action'] }

import 'server-only';

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Registered claims shared by every token this app signs and accepts.
const JWT_ISSUER = 'odooxpeoplepay';
const JWT_AUDIENCE = 'odooxpeoplepay';

// Used when JWT_EXPIRES_IN is not configured.
const DEFAULT_EXPIRES_IN = '7d';

// Minimum accepted JWT_SECRET length in characters (>= 256 bits of entropy).
const MIN_SECRET_LENGTH = 32;

// Encodes JWT_SECRET on every call (not at module load) so hot reloads and
// tests pick up env changes without re-importing the module.
function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is not set or too weak (minimum ${MIN_SECRET_LENGTH} characters). ` +
        'Add a long random value to backend/.env.local and keep it out of version control.',
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs an auth token for the given payload using HS256.
 *
 * @param {Record<string, unknown>} payload Public session claims, e.g.
 *   { sub: '1', email: 'admin@northstar.io', role: 'ADMIN', permissions: ['*'] }.
 * @param {{ expiresIn?: string }} [options] Optional lifetime override
 *   (e.g. '2h', '30m'). Falls back to JWT_EXPIRES_IN, then '7d'.
 * @returns {Promise<string>} The compact JWT string.
 */
export async function signAuthToken(payload, { expiresIn } = {}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(expiresIn ?? process.env.JWT_EXPIRES_IN ?? DEFAULT_EXPIRES_IN)
    .sign(getSecretKey());
}

/**
 * Verifies a compact JWT (signature, expiry, issuer, audience).
 *
 * @param {string} token The compact JWT, e.g. from a cookie or the
 *   Authorization header.
 * @returns {Promise<object|null>} The verified payload, or null when the
 *   token is missing, malformed, expired, or signed with a different key —
 *   callers can treat `null` as "not authenticated".
 */
export async function verifyAuthToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload;
  } catch {
    // Any verification failure (expired, tampered, wrong key, malformed)
    // simply means "not authenticated".
    return null;
  }
}

// ---------------------------------------------------------------------------
// Password hashing (bcryptjs)
// ---------------------------------------------------------------------------

// Cost factor for bcrypt: 12 rounds ≈ 200–300 ms per hash on typical hardware,
// a solid balance between brute-force resistance and login latency.
const BCRYPT_ROUNDS = 12;

/**
 * Hashes a plaintext password with bcrypt for storage in users.password_hash.
 *
 * bcrypt embeds a per-password random salt in the hash itself and is
 * deliberately slow, unlike unsalted SHA-256. The 72-byte bcrypt input limit
 * is enforced at the API validation layer (register payload max length).
 *
 * @param {string} plainPassword The raw password as typed by the user.
 * @returns {Promise<string>} A ~60-char bcrypt hash, e.g. "$2b$12$...".
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Checks a plaintext password against a stored bcrypt hash (timing-safe).
 *
 * @param {string} plainPassword The raw password as typed by the user.
 * @param {string} passwordHash A bcrypt hash previously produced by
 *   hashPassword() (e.g. users.password_hash).
 * @returns {Promise<boolean>} True when the password matches the hash.
 */
export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}