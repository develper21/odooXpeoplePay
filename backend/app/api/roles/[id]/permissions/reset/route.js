// backend/app/api/roles/[id]/permissions/reset/route.js
// Reset a role's permissions to default canonical permissions.

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { roles } from '@/lib/schema';

const DEFAULT_PERMISSIONS = {
  ADMIN: ['*'],
  HR_MANAGER: ['*'],
  HR_PAYROLL_USER: ['employees:*', 'attendance:*', 'contracts:*', 'schedules:*', 'time_off:*', 'payroll:*', 'payruns:*', 'payslips:*', 'salary_structures:*', 'salary_rules:*', 'reports:read', 'dashboard:read'],
  HR_PAYROLL_MANAGER: ['*'],
  EMPLOYEE: ['profile:read', 'employees:read', 'contracts:read', 'schedules:read', 'attendance:*', 'time_off:*', 'payroll:read', 'payruns:read', 'payslips:*', 'dashboard:read'],
};

export async function POST(_request, { params }) {
  const { error } = await requirePermission('roles:write');
  if (error) return error;

  const { id } = await params;
  try {
    const roleId = Number(id);
    const filter = Number.isInteger(roleId) ? eq(roles.id, roleId) : eq(roles.code, String(id).toUpperCase());
    const [existing] = await db.select().from(roles).where(filter).limit(1);
    if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    const code = existing.code?.toUpperCase();
    const defaults = DEFAULT_PERMISSIONS[code] || ['profile:read'];

    const [updated] = await db
      .update(roles)
      .set({ permissions: defaults })
      .where(eq(roles.id, existing.id))
      .returning({ id: roles.id, permissions: roles.permissions });

    return NextResponse.json({ permissions: updated.permissions });
  } catch (err) {
    console.error('POST /api/roles/:id/permissions/reset failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
