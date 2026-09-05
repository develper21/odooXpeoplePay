// lib/auth-guard.js
// Session resolution + permission-based route guards.
//
// Phase 3.8: the Phase 3.7 interim ADMIN-only gate (requireAdminUser) was
// replaced by this general, permission-key authorization:
// - requireUser()        → session + account-state resolution (401/403).
// - requirePermission(p) → requireUser() + hasPermission() evaluation.
// - hasPermission()      → pure matching logic in lib/permissions.js.
//
// Discipline (mirrors GET /api/auth/me):
// - The JWT proves who logged in; the database decides who is still a valid,
//   active, roled user and WHICH permissions they hold right now — so role
//   and permission changes take effect immediately, without waiting for
//   token expiry.
// - 401: no cookie, invalid/expired/forged token, deleted user.
// - 403: inactive account, no role assigned, or missing required permission.

import 'server-only';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { verifyAuthToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { roles, users } from '@/lib/schema';

/**
 * Resolves the current session and account state. The shared first half of
 * every guard: authentication (401) and account state (403) only — no
 * permission evaluation.
 *
 * @returns {Promise<{user: object|null, error: NextResponse|null}>}
 *   `error` is set for every rejection — return it from the route handler
 *   immediately. When `error` is null, `user` holds the fresh DB row with
 *   safe fields (id, email, name, role code/name, permissions, ...).
 */
export async function requireUser() {
  // 1. The session travels only in the httpOnly cookie; no cookie → 401.
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
    };
  }

  // 2. Signature + expiry + issuer/audience verification (lib/auth.js).
  //    Invalid, forged, or expired tokens all collapse to the same 401.
  const payload = await verifyAuthToken(token);
  const userId = Number(payload?.sub);
  if (!payload?.sub || !Number.isInteger(userId) || userId <= 0) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
    };
  }

  // 3. Fresh DB lookup: role/permission changes and deactivations apply
  //    immediately (the JWT's embedded claims are never trusted for access).
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      isActive: users.isActive,
      roleId: users.roleId,
      roleCode: roles.code,
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    // Token is valid but the user was deleted after login.
    return {
      user: null,
      error: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
    };
  }
  if (!user.isActive) {
    return {
      user: null,
      error: NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 }),
    };
  }
  if (!user.roleId || !user.roleCode) {
    return {
      user: null,
      error: NextResponse.json({ error: 'This account has no role assigned yet.' }, { status: 403 }),
    };
  }

  return { user, error: null };
}

/**
 * Requires an authenticated, active, roled user whose CURRENT database
 * permissions grant `permission` — exact 'module:action' keys, 'module:*' or
 * the global '*' wildcard (see lib/permissions.js).
 *
 * @param {string} permission The required permission key, e.g. 'roles:read'.
 * @returns {Promise<{user: object|null, error: NextResponse|null}>}
 */
export async function requirePermission(permission) {
  const { user, error } = await requireUser();
  if (error) return { user, error };

  if (!hasPermission(user, permission)) {
    return {
      user,
      error: NextResponse.json(
        { error: 'Missing required permission.', permission },
        { status: 403 },
      ),
    };
  }

  return { user, error: null };
}