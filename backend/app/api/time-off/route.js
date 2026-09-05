// Time-off request collection API: list and create company-scoped leave requests.

import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import {
  allocations,
  employees,
  timeOffRequests,
  timeOffTypes,
} from '@/lib/schema';

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
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
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

const createTimeOffRequestSchema = z
  .object({
    employee_id: z.number().int().positive(),
    time_off_type_id: z.number().int().positive(),
    allocation_id: z.number().int().positive().nullable().optional(),
    start_date: z.string().date(),
    end_date: z.string().date(),
    start_time: timeValue,
    end_time: timeValue,
    is_half_day: z.boolean().optional(),
    days_requested: daysRequested,
    reason: z.string().trim().nullable().optional(),
    approved_by_id: z.number().int().positive().nullable().optional(),
    approved_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'end_date must be on or after start_date.',
    path: ['end_date'],
  })
  .refine((data) => {
    const start = Date.parse(`${data.start_date}T00:00:00Z`);
    const end = Date.parse(`${data.end_date}T00:00:00Z`);
    const rangeDays = Math.floor((end - start) / 86400000) + 1;
    return data.days_requested <= rangeDays;
  }, {
    message: 'days_requested cannot exceed the requested date range.',
    path: ['days_requested'],
  });

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
    return NextResponse.json(
      { error: `${label} ${employeeId} is not active.` },
      { status: 422 },
    );
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

async function findConflict(employeeId, startDate, endDate, companyId) {
  const [conflict] = await db
    .select({ id: timeOffRequests.id })
    .from(timeOffRequests)
    .where(and(
      eq(timeOffRequests.companyId, companyId),
      eq(timeOffRequests.employeeId, employeeId),
      inArray(timeOffRequests.status, ['pending', 'approved']),
      lte(timeOffRequests.startDate, endDate),
      gte(timeOffRequests.endDate, startDate),
    ))
    .limit(1);
  return conflict ?? null;
}

async function validateAllocation(allocationId, employeeId, companyId) {
  if (allocationId == null) return null;
  const allocation = await db.query.allocations.findFirst({
    columns: { id: true, companyId: true, employeeId: true },
    where: (row, { eq: equals }) => equals(row.id, allocationId),
  });
  if (!allocation) return NextResponse.json({ error: `Allocation ${allocationId} not found.` }, { status: 422 });
  if (allocation.companyId !== companyId) {
    return NextResponse.json(
      { error: `Allocation ${allocationId} does not belong to the current company.` },
      { status: 422 },
    );
  }
  if (allocation.employeeId !== employeeId) {
    return NextResponse.json(
      { error: `Allocation ${allocationId} does not belong to employee ${employeeId}.` },
      { status: 422 },
    );
  }
  return null;
}

export async function GET() {
  const { error } = await requirePermission('time_off:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ time_off_requests: [] });

    const rows = await db
      .select(timeOffRequestColumns)
      .from(timeOffRequests)
      .where(eq(timeOffRequests.companyId, companyId))
      .orderBy(asc(timeOffRequests.startDate), asc(timeOffRequests.id));

    return NextResponse.json({ time_off_requests: rows });
  } catch (err) {
    console.error('GET /api/time-off failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('time_off:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createTimeOffRequestSchema.safeParse(body ?? {});
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

  const data = parsed.data;
  const companyId = await getCompanyId();
  if (companyId === null) {
    return NextResponse.json(
      { error: 'Company profile must be set up before creating time-off requests.' },
      { status: 409 },
    );
  }

  const employeeError = await validateEmployee(data.employee_id, companyId);
  if (employeeError) return employeeError;
  const typeError = await validateType(data.time_off_type_id, companyId);
  if (typeError) return typeError;
  const allocationError = await validateAllocation(data.allocation_id, data.employee_id, companyId);
  if (allocationError) return allocationError;
  if (data.approved_by_id != null) {
    const approverError = await validateEmployee(data.approved_by_id, companyId, 'Approving employee');
    if (approverError) return approverError;
  }
  if (await findConflict(data.employee_id, data.start_date, data.end_date, companyId)) {
    return NextResponse.json(
      { error: 'This employee already has a pending or approved request overlapping these dates.' },
      { status: 409 },
    );
  }

  try {
    const [timeOffRequest] = await db
      .insert(timeOffRequests)
      .values({
        companyId,
        employeeId: data.employee_id,
        timeOffTypeId: data.time_off_type_id,
        allocationId: data.allocation_id ?? null,
        startDate: data.start_date,
        endDate: data.end_date,
        startTime: data.start_time ?? null,
        endTime: data.end_time ?? null,
        isHalfDay: data.is_half_day ?? false,
        daysRequested: String(data.days_requested),
        reason: data.reason?.trim() || null,
        status: 'pending',
        approvedById: data.approved_by_id ?? null,
        approvedAt: data.approved_at ? new Date(data.approved_at) : null,
      })
      .returning(timeOffRequestColumns);

    return NextResponse.json({ time_off_request: timeOffRequest }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503') {
      return NextResponse.json({ error: 'Time-off request references a record that does not exist.' }, { status: 409 });
    }
    console.error('POST /api/time-off failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
