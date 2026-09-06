// backend/app/api/roles/[id]/permissions/route.js
// Get and update permissions assigned to a role.

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { roles } from '@/lib/schema';

export async function GET(_request, { params }) {
  const { error } = await requirePermission('roles:read');
  if (error) return error;

  const { id } = await params;
  try {
    const roleId = Number(id);
    const filter = Number.isInteger(roleId) ? eq(roles.id, roleId) : eq(roles.code, String(id).toUpperCase());
    const [role] = await db.select({ permissions: roles.permissions }).from(roles).where(filter).limit(1);
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    return NextResponse.json({ permissions: role.permissions || [] });
  } catch (err) {
    console.error('GET /api/roles/:id/permissions failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { error } = await requirePermission('roles:write');
  if (error) return error;

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const permissions = Array.isArray(body.permissions) ? body.permissions : [];

  try {
    const roleId = Number(id);
    const filter = Number.isInteger(roleId) ? eq(roles.id, roleId) : eq(roles.code, String(id).toUpperCase());

    const [updated] = await db
      .update(roles)
      .set({ permissions })
      .where(filter)
      .returning({ id: roles.id, permissions: roles.permissions });

    if (!updated) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    return NextResponse.json({ permissions: updated.permissions });
  } catch (err) {
    console.error('PUT /api/roles/:id/permissions failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
