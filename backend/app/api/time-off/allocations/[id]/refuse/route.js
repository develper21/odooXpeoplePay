// backend/app/api/time-off/allocations/[id]/refuse/route.js
// Refuses an allocation and marks it revoked.

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
  allocated_days: allocations.allocatedDays,
  used_days: allocations.usedDays,
  remaining_days: allocations.remainingDays,
  status: allocations.status,
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

    if (existing.status === 'revoked') {
      return NextResponse.json({ allocation: existing });
    }

    if (Number(existing.used_days) > 0) {
      return NextResponse.json(
        { error: 'Cannot refuse an allocation that has already been partially used by approved leave requests.' },
        { status: 409 }
      );
    }

    const [updated] = await db
      .update(allocations)
      .set({ status: 'revoked' })
      .where(and(eq(allocations.id, allocationId), eq(allocations.companyId, companyId)))
      .returning(allocationColumns);

    return NextResponse.json({ allocation: updated });
  } catch (err) {
    console.error('POST /api/time-off/allocations/:id/refuse failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
