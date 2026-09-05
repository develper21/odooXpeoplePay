

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { signAuthToken, verifyPassword } from '@/lib/auth';
import {
  AUTH_COOKIE_NAME,
  authCookieBaseAttributes,
  authCookieMaxAgeSeconds,
} from '@/lib/auth-cookie';
import { db } from '@/lib/db';
import { roles, users } from '@/lib/schema';

// Same normalisation + bcrypt 72-byte input cap as the register contract.
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .pipe(z.email('A valid email address is required.')),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(72, 'Password must be at most 72 characters long.'),
});

// Precomputed bcrypt hash of a throw-away value. Compared against whenever the
// email lookup misses, so "unknown email" costs the same ~300 ms of bcrypt
// work as "wrong password" (timing-based user enumeration defence).
const DUMMY_PASSWORD_HASH = '$2b$12$zAl4rqHRkSOHaz98ABHDmOvkMNwD0itnX8ZDud5wsdakEesU0OGwC';

export async function POST(request) {
  // Malformed JSON is a client error (400), not a server error (500).
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid login payload.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  try {
    // Left join: users.role_id is nullable by design, so a user without a
    // role must still be found (and then rejected with 403, not 401).
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleId: users.roleId,
        roleCode: roles.code,
        roleName: roles.name,
        permissions: roles.permissions,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email))
      .limit(1);

    // One generic 401 for both "unknown email" and "wrong password".
    const INVALID_CREDENTIALS = { error: 'Invalid email or password.' };

    if (!user) {
      // Burn the same bcrypt time a real compare would take.
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }

    // bcrypt-only verification. A malformed stored hash is treated as a
    // mismatch (401) rather than crashing with a 500.
    let passwordMatches = false;
    try {
      passwordMatches = await verifyPassword(password, user.passwordHash);
    } catch {
      passwordMatches = false;
    }
    if (!passwordMatches) {
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }

    // Reached only by the credential holder: reject inactive accounts and
    // accounts that have no role assigned yet.
    if (!user.isActive) {
      return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 });
    }
    if (!user.roleId || !user.roleCode) {
      return NextResponse.json({ error: 'This account has no role assigned yet.' }, { status: 403 });
    }

    // Stamp last_login_at on success (also bumps updated_at via $onUpdate).
    const loginAt = new Date();
    await db.update(users).set({ lastLoginAt: loginAt }).where(eq(users.id, user.id));

    // JWT payload per the lib/auth.js convention: user id (sub), role_id,
    // role code and the role's granular permission keys.
    const token = await signAuthToken({
      sub: String(user.id),
      email: user.email,
      role_id: user.roleId,
      role: user.roleCode,
      permissions: user.permissions ?? [],
    });

    // Token transport (Phase 3.5): the JWT is delivered ONLY as an httpOnly
    // cookie so client-side JavaScript can never read it and an XSS cannot
    // exfiltrate it. It is deliberately NOT repeated in the JSON body.
    const response = NextResponse.json({
      user: {
        id: user.id,
        role_id: user.roleId,
        role_code: user.roleCode,
        role_name: user.roleName,
        permissions: user.permissions ?? [],
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        is_active: user.isActive,
        last_login_at: loginAt.toISOString(),
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      ...authCookieBaseAttributes(),
      maxAge: authCookieMaxAgeSeconds(),
    });
    return response;
  } catch (error) {
    console.error('POST /api/auth/login failed:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}