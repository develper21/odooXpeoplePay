// backend/app/api/time-off/allocations/[id]/approve/route.js
// Approves a pending allocation and marks it active.

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { allocations } from '@/lib/schema';

const allocationColumns = {
  id: allocations.id,
  company_id: allocations.companyId,
  employee_id: allocations.employeeId,
  time_off_type_id: allocations.timeOffTypeId,
  period_year: allocations.periodYear,
  entitled_days: allocations.entitledDays,
  allocated_days: allocations.allocatedDays,
  used_days: allocations.usedDays,
  remaining_days: allocations.remainingDays,
  status: allocations.status,
  effective_from: allocations.effectiveFrom,
  effective_to: allocations.effectiveTo,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({ columns: { id: true } });
  return company?.id ?? null;
}

export async function POST(_request, { params }) {
  const { error } = await requirePermission('time_off:approve');
  if (error) return error;

  const { id } = await params;
  const allocationId = Number(id);
  if (!Number.isInteger(allocationId) || allocationId <= 0) {
    return NextResponse.json({ error: 'Invalid allocation id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: 'Company not found.' }, { status: 404 });

    const [existing] = await db
      .select(allocationColumns)
      .from(allocations)
      .where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: `Allocation ${allocationId} not found.` }, { status: 404 });
    }

    if (existing.status === 'active') {
      return NextResponse.json({ allocation: existing });
    }

    const [updated] = await db
      .update(allocations)
      .set({ status: 'active' })
      .where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)))
      .returning(allocationColumns);

    return NextResponse.json({ allocation: updated });
  } catch (err) {
    console.error('POST /api/time-off/allocations/:id/approve failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
