// POST /api/time-off/:id/approve
// Approves a pending, company-scoped time-off request.

import { and, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { employees, timeOffRequests } from '@/lib/schema';

const timeOffRequestColumns = {
  id: timeOffRequests.id,
  company_id: timeOffRequests.companyId,
  employee_id: timeOffRequests.employeeId,
  time_off_type_id: timeOffRequests.timeOffTypeId,
  allocation_id: timeOffRequests.allocationId,
  start_date: timeOffRequests.startDate,
  end_date: timeOffRequests.endDate,
  start_time: timeOffRequests.startTime,
  end_time: timeOffRequests.endTime,
  is_half_day: timeOffRequests.isHalfDay,
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
    orderBy: (row, { asc }) => asc(row.id),
  });
  return company?.id ?? null;
}

async function findRequest(id, companyId) {
  const [request] = await db
    .select(timeOffRequestColumns)
    .from(timeOffRequests)
    .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.companyId, companyId)))
    .limit(1);
  return request;
}

export async function POST(_request, { params }) {
  const { user, error } = await requirePermission('time_off:approve');
  if (error) return error;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid time-off request id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    }

    const existing = await findRequest(id, companyId);
    if (!existing) {
      return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `Time-off request ${id} is already ${existing.status}.` },
        { status: 409 },
      );
    }

    const [approver] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.userId, user.id), eq(employees.companyId, companyId)))
      .limit(1);

    const [timeOffRequest] = await db
      .update(timeOffRequests)
      .set({
        status: 'approved',
        approvedById: approver?.id ?? null,
        approvedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(timeOffRequests.id, id),
          eq(timeOffRequests.companyId, companyId),
          eq(timeOffRequests.status, 'pending'),
        ),
      )
      .returning(timeOffRequestColumns);

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: `Time-off request ${id} was already processed.` },
        { status: 409 },
      );
    }

    return NextResponse.json({ time_off_request: timeOffRequest });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503') {
      return NextResponse.json({ error: 'Approval references a record that does not exist.' }, { status: 409 });
    }
    console.error('POST /api/time-off/:id/approve failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
