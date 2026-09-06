// app/api/auth/me/route.js
// GET /api/auth/me — return the currently authenticated user's session data.
//
// Contract:
//   200 → { user: { id, role_id, role_code, role_name, permissions, email,
//                   first_name, last_name, phone, is_active, last_login_at,
//                   created_at, updated_at } }
//   401 → { error } — no session cookie, invalid/expired/forged token, or the
//                     user behind the token no longer exists
//   403 → { error } — the account behind a VALID token is deactivated or has
//                     no role assigned
//   405 → any other method
//
// How it works:
// - Reads the hrms_token httpOnly cookie (lib/auth-cookie.js) and verifies it
//   with lib/auth.js verifyAuthToken() — signature, expiry, issuer, audience.
// - Uses the token's `sub` (user id) claim to load the user + role FRESH from
//   the database, so the DB — not the still-unexpired JWT — is the source of
//   truth: deactivations, role removals and deletions take effect
//   immediately, and permission changes are reflected without waiting for
//   token expiry.
// - Returns safe fields only: never password_hash, never the token itself.
// - No permission guards/middleware yet — this route only authenticates.

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { verifyAuthToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie';
import { db } from '@/lib/db';
import { employees, roles, users } from '@/lib/schema';

export async function GET() {
  try {
    // 1. The session travels only in the httpOnly cookie; no cookie → 401.
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    // 2. Signature + expiry + issuer/audience verification (lib/auth.js).
    //    Invalid, forged, or expired tokens all collapse to the same 401.
    const payload = await verifyAuthToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    // 3. The sub claim must be a positive integer user id.
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    // 4. Fresh DB lookup: the JWT proves who logged in, the DB decides who is
    //    still a valid, active, roled user right now.
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleId: users.roleId,
        roleCode: roles.code,
        roleName: roles.name,
        permissions: roles.permissions,
        employeeId: employees.id,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(employees, eq(employees.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      // Token is valid but the user was deleted after login.
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 });
    }
    if (!user.roleId || !user.roleCode) {
      return NextResponse.json({ error: 'This account has no role assigned yet.' }, { status: 403 });
    }

    // 5. Safe fields only — the same user shape POST /api/auth/login returns.
    return NextResponse.json({
      user: {
        id: user.id,
        role_id: user.roleId,
        role_code: user.roleCode,
        role_name: user.roleName,
        permissions: user.permissions ?? [],
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone,
        is_active: user.isActive,
        employee_id: user.employeeId,
        employeeId: user.employeeId ? String(user.employeeId) : undefined,
        last_login_at: user.lastLoginAt,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/auth/me failed:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}