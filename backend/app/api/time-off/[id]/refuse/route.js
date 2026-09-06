// backend/app/api/time-off/[id]/refuse/route.js
// Refuses a time-off request and restores consumed allocation balance if needed.

import { and, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { allocations, employees, timeOffRequests } from '@/lib/schema';

const timeOffRequestColumns = {
  id: timeOffRequests.id,
  company_id: timeOffRequests.companyId,
  employee_id: timeOffRequests.employeeId,
  time_off_type_id: timeOffRequests.timeOffTypeId,
  allocation_id: timeOffRequests.allocationId,
  start_date: timeOffRequests.startDate,
  end_date: timeOffRequests.endDate,
  days_requested: timeOffRequests.daysRequested,
  reason: timeOffRequests.reason,
  status: timeOffRequests.status,
  approved_by_id: timeOffRequests.approvedById,
  approved_at: timeOffRequests.approvedAt,
  created_at: timeOffRequests.createdAt,
  updated_at: timeOffRequests.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
  });
  return company?.id ?? null;
}

export async function POST(_request, { params }) {
  const { user, error } = await requirePermission('time_off:approve');
  if (error) return error;

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: 'Invalid time-off request id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Time-off request ${requestId} not found.` }, { status: 404 });
    }

    const [existing] = await db
      .select(timeOffRequestColumns)
      .from(timeOffRequests)
      .where(and(eq(timeOffRequests.id, requestId), eq(timeOffRequests.companyId, companyId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: `Time-off request ${requestId} not found.` }, { status: 404 });
    }

    if (existing.status === 'rejected') {
      return NextResponse.json({ time_off_request: existing });
    }

    // If it was approved and had an allocation, restore balance
    if (existing.status === 'approved' && existing.allocation_id) {
      const [alloc] = await db
        .select()
        .from(allocations)
        .where(eq(allocations.id, existing.allocation_id))
        .limit(1);

      if (alloc) {
        const days = Number(existing.days_requested);
        const newUsed = Math.max(0, Number(alloc.usedDays) - days);
        const newRemaining = Math.max(0, Number(alloc.allocatedDays) - newUsed);
        await db
          .update(allocations)
          .set({
            usedDays: String(newUsed),
            remainingDays: String(newRemaining),
          })
          .where(eq(allocations.id, alloc.id));
      }
    }

    const [approver] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.userId, user.id), eq(employees.companyId, companyId)))
      .limit(1);

    const [updated] = await db
      .update(timeOffRequests)
      .set({
        status: 'rejected',
        approvedById: approver?.id ?? null,
        approvedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(timeOffRequests.id, requestId), eq(timeOffRequests.companyId, companyId)))
      .returning(timeOffRequestColumns);

    return NextResponse.json({ time_off_request: updated });
  } catch (err) {
    console.error('POST /api/time-off/:id/refuse failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
