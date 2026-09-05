// app/api/roles/[id]/route.js
// GET /api/roles/:id — fetch a single role by id.
//
// Contract:
//   200 → { role: { id, name, code, permissions, is_system } }
//   400 → { error } — id is not a positive integer
//   401 → { error } — not authenticated (no/invalid/expired session)
//   403 → { error, permission } — authenticated but lacking 'roles:read'
//                                 (inactive/role-less accounts also 403)
//   404 → { error } — no role with that id
//   405 → any other method
//
// Scope notes:
// - Gate: requirePermission('roles:read') (lib/auth-guard.js). Effective
//   permissions are read fresh from the database, so only roles actually
//   granted 'roles:read' — or the '*' wildcard (ADMIN) — get access.
// - Same five safe fields as the collection endpoint; description and
//   timestamps stay internal.

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { roles } from '@/lib/schema';

export async function GET(request, { params }) {
  const { error } = await requirePermission('roles:read');
  if (error) return error;

  // params is a Promise in the Next.js App Router.
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isInteger(roleId) || roleId <= 0) {
    return NextResponse.json({ error: 'Invalid role id.' }, { status: 400 });
  }

  try {
    const [role] = await db
      .select({
        id: roles.id,
        name: roles.name,
        code: roles.code,
        permissions: roles.permissions,
        is_system: roles.isSystem,
      })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) {
      return NextResponse.json({ error: `Role ${roleId} not found.` }, { status: 404 });
    }

    return NextResponse.json({ role });
  } catch (err) {
    console.error('GET /api/roles/[id] failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}