// backend/app/api/time-off/allocations/[id]/route.js
// Individual allocation API: retrieve, update, and safely delete allocations.

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { allocations, employees, timeOffTypes } from '@/lib/schema';

const allocationColumns = {
  id: allocations.id,
  company_id: allocations.companyId,
  employee_id: allocations.employeeId,
  time_off_type_id: allocations.timeOffTypeId,
  period_year: allocations.periodYear,
  entitled_days: allocations.entitledDays,
  allocated_days: allocations.allocatedDays,
  carried_over_days: allocations.carriedOverDays,
  additional_days: allocations.additionalDays,
  used_days: allocations.usedDays,
  pending_days: allocations.pendingDays,
  remaining_days: allocations.remainingDays,
  effective_from: allocations.effectiveFrom,
  effective_to: allocations.effectiveTo,
  status: allocations.status,
  created_at: allocations.createdAt,
  updated_at: allocations.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('time_off:read');
  if (error) return error;

  const { id } = await params;
  const allocationId = Number(id);
  if (!Number.isInteger(allocationId) || allocationId <= 0) {
    return NextResponse.json({ error: 'Invalid allocation id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Allocation ${allocationId} not found.` }, { status: 404 });

    const [row] = await db
      .select({
        ...allocationColumns,
        employee: {
          id: employees.id,
          employee_code: employees.employeeCode,
          first_name: employees.firstName,
          last_name: employees.lastName,
          email: employees.email,
        },
        time_off_type: {
          id: timeOffTypes.id,
          name: timeOffTypes.name,
          code: timeOffTypes.code,
        },
      })
      .from(allocations)
      .innerJoin(employees, eq(allocations.employeeId, employees.id))
      .innerJoin(timeOffTypes, eq(allocations.timeOffTypeId, timeOffTypes.id))
      .where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: `Allocation ${allocationId} not found.` }, { status: 404 });
    }

    return NextResponse.json({ allocation: row });
  } catch (err) {
    console.error('GET /api/time-off/allocations/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error: authError } = await requirePermission('time_off:write');
  if (authError) return authError;

  const { id } = await params;
  const allocationId = Number(id);
  if (!Number.isInteger(allocationId) || allocationId <= 0) {
    return NextResponse.json({ error: 'Invalid allocation id.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: 'No company configured.' }, { status: 422 });

    const [existing] = await db
      .select(allocationColumns)
      .from(allocations)
      .where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: `Allocation ${allocationId} not found.` }, { status: 404 });
    }

    const updates = {};
    if (body.allocated_days !== undefined || body.allocatedDays !== undefined || body.days !== undefined) {
      const days = Number(body.allocated_days ?? body.allocatedDays ?? body.days);
      if (isNaN(days) || days < 0) return NextResponse.json({ error: 'Invalid allocated days.' }, { status: 400 });
      updates.allocatedDays = String(days);
      const used = Number(existing.used_days);
      updates.remainingDays = String(Math.max(0, days - used));
    }
    if (body.effective_from || body.effectiveFrom) {
      updates.effectiveFrom = body.effective_from || body.effectiveFrom;
    }
    if (body.effective_to !== undefined || body.effectiveTo !== undefined) {
      updates.effectiveTo = body.effective_to ?? body.effectiveTo ?? null;
    }
    if (body.status) {
      const statusLower = body.status.toLowerCase();
      if (['active', 'expired', 'revoked'].includes(statusLower)) {
        updates.status = statusLower;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ allocation: existing });
    }

    const [updated] = await db
      .update(allocations)
      .set(updates)
      .where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)))
      .returning(allocationColumns);

    return NextResponse.json({ allocation: updated });
  } catch (err) {
    console.error('PATCH /api/time-off/allocations/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error: authError } = await requirePermission('time_off:write');
  if (authError) return authError;

  const { id } = await params;
  const allocationId = Number(id);
  if (!Number.isInteger(allocationId) || allocationId <= 0) {
    return NextResponse.json({ error: 'Invalid allocation id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: 'No company configured.' }, { status: 422 });

    const [existing] = await db
      .select(allocationColumns)
      .from(allocations)
      .where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: `Allocation ${allocationId} not found.` }, { status: 404 });
    }

    if (Number(existing.used_days) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete allocation that has already been consumed by approved leave requests.' },
        { status: 409 }
      );
    }

    await db.delete(allocations).where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/time-off/allocations/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
