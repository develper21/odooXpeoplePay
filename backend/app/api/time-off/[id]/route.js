// Single time-off request API: read, update, delete one company-scoped request.

import { and, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { allocations, employees, timeOffRequests, timeOffTypes } from '@/lib/schema';

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

function parseId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const timeValue = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:MM or HH:MM:SS.')
  .nullable()
  .optional();
const daysRequested = z
  .union([
    z.number(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a positive number with up to 2 decimals.'),
  ])
  .transform(Number)
  .refine((value) => value > 0 && value <= 999999.99, 'Must be greater than 0 and at most 999999.99.');

const updateTimeOffRequestSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  time_off_type_id: z.number().int().positive().optional(),
  allocation_id: z.number().int().positive().nullable().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  start_time: timeValue,
  end_time: timeValue,
  is_half_day: z.boolean().optional(),
  days_requested: daysRequested.optional(),
  reason: z.string().trim().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  approved_by_id: z.number().int().positive().nullable().optional(),
  approved_at: z.string().datetime({ offset: true }).nullable().optional(),
});

async function findTimeOffRequest(id, companyId) {
  const [timeOffRequest] = await db
    .select(timeOffRequestColumns)
    .from(timeOffRequests)
    .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.companyId, companyId)))
    .limit(1);
  return timeOffRequest;
}

async function validateEmployee(employeeId, companyId, label = 'Employee') {
  const employee = await db.query.employees.findFirst({
    columns: { id: true, companyId: true, status: true },
    where: (row, { eq: equals }) => equals(row.id, employeeId),
  });
  if (!employee) return NextResponse.json({ error: `${label} ${employeeId} not found.` }, { status: 422 });
  if (employee.companyId !== companyId) {
    return NextResponse.json(
      { error: `${label} ${employeeId} does not belong to the current company.` },
      { status: 422 },
    );
  }
  if (employee.status !== 'active') {
    return NextResponse.json({ error: `${label} ${employeeId} is not active.` }, { status: 422 });
  }
  return null;
}

async function validateType(typeId, companyId) {
  const timeOffType = await db.query.timeOffTypes.findFirst({
    columns: { id: true, companyId: true, status: true },
    where: (row, { eq: equals }) => equals(row.id, typeId),
  });
  if (!timeOffType) return NextResponse.json({ error: `Time-off type ${typeId} not found.` }, { status: 422 });
  if (timeOffType.companyId !== companyId) {
    return NextResponse.json(
      { error: `Time-off type ${typeId} does not belong to the current company.` },
      { status: 422 },
    );
  }
  if (timeOffType.status !== 'active') {
    return NextResponse.json({ error: `Time-off type ${typeId} is not active.` }, { status: 422 });
  }
  return null;
}

async function validateAllocation(allocationId, employeeId, companyId) {
  if (allocationId == null) return null;
  const allocation = await db.query.allocations.findFirst({
    columns: { id: true, companyId: true, employeeId: true },
    where: (row, { eq: equals }) => equals(row.id, allocationId),
  });
  if (!allocation) return NextResponse.json({ error: `Allocation ${allocationId} not found.` }, { status: 422 });
  if (allocation.companyId !== companyId) {
    return NextResponse.json({ error: `Allocation ${allocationId} does not belong to the current company.` }, { status: 422 });
  }
  if (allocation.employeeId !== employeeId) {
    return NextResponse.json({ error: `Allocation ${allocationId} does not belong to employee ${employeeId}.` }, { status: 422 });
  }
  return null;
}

async function findConflict(requestId, employeeId, startDate, endDate, companyId) {
  const [conflict] = await db
    .select({ id: timeOffRequests.id })
    .from(timeOffRequests)
    .where(and(
      ne(timeOffRequests.id, requestId),
      eq(timeOffRequests.companyId, companyId),
      eq(timeOffRequests.employeeId, employeeId),
      inArray(timeOffRequests.status, ['pending', 'approved']),
      lte(timeOffRequests.startDate, endDate),
      gte(timeOffRequests.endDate, startDate),
    ))
    .limit(1);
  return conflict ?? null;
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('time_off:read');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid time-off request id.' }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    const timeOffRequest = await findTimeOffRequest(id, companyId);
    if (!timeOffRequest) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    return NextResponse.json({ time_off_request: timeOffRequest });
  } catch (err) {
    console.error('GET /api/time-off/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('time_off:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid time-off request id.' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (body === null || typeof body !== 'object' || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  }

  const parsed = updateTimeOffRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid time-off request payload.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    const existing = await findTimeOffRequest(id, companyId);
    if (!existing) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    if (existing.status === 'approved' || existing.status === 'rejected') {
      return NextResponse.json(
        { error: `Time-off request ${id} cannot be edited after it is ${existing.status}.` },
        { status: 409 },
      );
    }

    const data = parsed.data;
    const employeeId = data.employee_id ?? existing.employee_id;
    const typeId = data.time_off_type_id ?? existing.time_off_type_id;
    const allocationId = data.allocation_id !== undefined ? data.allocation_id : existing.allocation_id;
    const startDate = data.start_date ?? existing.start_date;
    const endDate = data.end_date ?? existing.end_date;

    if (endDate < startDate) {
      return NextResponse.json({ error: 'end_date must be on or after start_date.' }, { status: 422 });
    }
    const rangeDays = Math.floor(
      (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000,
    ) + 1;
    const daysValue = data.days_requested ?? Number(existing.days_requested);
    if (daysValue > rangeDays) {
      return NextResponse.json(
        { error: 'days_requested cannot exceed the requested date range.' },
        { status: 422 },
      );
    }
    if (data.status === 'approved' || data.status === 'rejected') {
      return NextResponse.json(
        { error: 'Use the approval workflow endpoint to approve or reject a request.' },
        { status: 409 },
      );
    }
    const employeeError = await validateEmployee(employeeId, companyId);
    if (employeeError) return employeeError;
    const typeError = await validateType(typeId, companyId);
    if (typeError) return typeError;
    const allocationError = await validateAllocation(allocationId, employeeId, companyId);
    if (allocationError) return allocationError;
    if (data.approved_by_id != null) {
      const approverError = await validateEmployee(data.approved_by_id, companyId, 'Approving employee');
      if (approverError) return approverError;
    }
    const effectiveStatus = data.status ?? existing.status;
    if (effectiveStatus === 'pending' || effectiveStatus === 'approved') {
      if (await findConflict(id, employeeId, startDate, endDate, companyId)) {
        return NextResponse.json(
          { error: 'This employee already has a pending or approved request overlapping these dates.' },
          { status: 409 },
        );
      }
    }

    const updates = {};
    const fieldMap = {
      employee_id: 'employeeId',
      time_off_type_id: 'timeOffTypeId',
      allocation_id: 'allocationId',
      start_date: 'startDate',
      end_date: 'endDate',
      start_time: 'startTime',
      end_time: 'endTime',
      is_half_day: 'isHalfDay',
      days_requested: 'daysRequested',
      reason: 'reason',
      status: 'status',
      approved_by_id: 'approvedById',
      approved_at: 'approvedAt',
    };
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      updates[fieldMap[key]] =
        key === 'days_requested'
          ? String(value)
          : key === 'reason'
            ? value?.trim() || null
            : key === 'approved_at'
              ? value ? new Date(value) : null
              : value;
    }

    const [timeOffRequest] = await db
      .update(timeOffRequests)
      .set(updates)
      .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.companyId, companyId)))
      .returning(timeOffRequestColumns);
    if (!timeOffRequest) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    return NextResponse.json({ time_off_request: timeOffRequest });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503') {
      return NextResponse.json({ error: 'Time-off request references a record that does not exist.' }, { status: 409 });
    }
    console.error('PATCH /api/time-off/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('time_off:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid time-off request id.' }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });

    const existing = await findTimeOffRequest(id, companyId);
    if (!existing) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    if (existing.status === 'approved' || existing.status === 'rejected') {
      return NextResponse.json(
        { error: `Time-off request ${id} cannot be deleted after it is ${existing.status}.` },
        { status: 409 },
      );
    }

    const [deleted] = await db
      .delete(timeOffRequests)
      .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.companyId, companyId)))
      .returning({ id: timeOffRequests.id });
    if (!deleted) return NextResponse.json({ error: `Time-off request ${id} not found.` }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint|violates foreign key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: 'Cannot delete this time-off request because other records reference it.' },
        { status: 409 },
      );
    }
    console.error('DELETE /api/time-off/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
