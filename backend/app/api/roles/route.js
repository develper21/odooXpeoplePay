// app/api/roles/route.js
// GET /api/roles — list every role available in the system.
//
// Contract:
//   200 → { roles: [{ id, name, code, permissions, is_system }, ...] }
//   401 → { error } — not authenticated (no/invalid/expired session)
//   403 → { error, permission } — authenticated but lacking 'roles:read'
//                                 (inactive/role-less accounts also 403)
//   405 → any other method
//
// Scope notes:
// - Reads the existing roles table; permissions is the role's JSONB array of
//   granular keys ('employees:read', 'payroll:*', '*').
// - Only the five listed fields are returned — description and timestamps
//   stay internal.
// - Gate: requirePermission('roles:read') (lib/auth-guard.js). Effective
//   permissions are read fresh from the database, so only roles actually
//   granted 'roles:read' — or the '*' wildcard (ADMIN) — get access.

import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { roles } from '@/lib/schema';

export async function GET() {
  const { error } = await requirePermission('roles:read');
  if (error) return error;

  try {
    const rows = await db
      .select({
        id: roles.id,
        name: roles.name,
        code: roles.code,
        permissions: roles.permissions,
        is_system: roles.isSystem,
      })
      .from(roles)
      .orderBy(roles.id);

    return NextResponse.json({ roles: rows });
  } catch (err) {
    console.error('GET /api/roles failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}