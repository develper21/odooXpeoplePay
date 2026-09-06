// Attendance collection API: list and create attendance records.
// Company scope is enforced through the employee relation because the
// attendances table intentionally has no company_id column.

import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { attendances, employees, workingSchedules } from '@/lib/schema';

const attendanceColumns = {
  id: attendances.id,
  employee_id: attendances.employeeId,
  working_schedule_id: attendances.workingScheduleId,
  attendance_date: attendances.attendanceDate,
  clock_in: attendances.clockIn,
  clock_out: attendances.clockOut,
  breaks_duration_minutes: attendances.breaksDurationMinutes,
  work_hours: attendances.workHours,
  overtime_hours: attendances.overtimeHours,
  status: attendances.status,
  source: attendances.source,
  notes: attendances.notes,
  approved_by_id: attendances.approvedById,
  approved_at: attendances.approvedAt,
  created_at: attendances.createdAt,
  updated_at: attendances.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (company, { asc: orderByAsc }) => orderByAsc(company.id),
  });
  return company?.id ?? null;
}

const attendanceStatuses = ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'remote'];
const attendanceSources = ['manual', 'device', 'mobile', 'import'];
const decimalHours = z
  .union([
    z.number(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a non-negative number with up to 2 decimals.'),
  ])
  .transform(Number)
  .refine((value) => value <= 999.99, 'Must be 999.99 or less.')
  .nullable()
  .optional();
const timestampField = z.string().datetime({ offset: true }).nullable().optional();

const attendanceFields = {
  employee_id: z.number().int().positive(),
  working_schedule_id: z.number().int().positive().nullable().optional(),
  attendance_date: z.string().date(),
  clock_in: timestampField,
  clock_out: timestampField,
  breaks_duration_minutes: z.number().int().nonnegative().optional(),
  work_hours: decimalHours,
  overtime_hours: decimalHours,
  status: z.enum(attendanceStatuses).optional(),
  source: z.enum(attendanceSources).optional(),
  notes: z.string().trim().nullable().optional(),
  approved_by_id: z.number().int().positive().nullable().optional(),
  approved_at: timestampField,
};

const createAttendanceSchema = z.object(attendanceFields);

function hasClockOrder(clockIn, clockOut) {
  if (!clockIn || !clockOut) return true;
  return new Date(clockOut).getTime() > new Date(clockIn).getTime();
}

async function validateEmployee(employeeId, companyId, label = 'Employee') {
  const employee = await db.query.employees.findFirst({
    columns: { id: true, companyId: true },
    where: (row, { eq: equals }) => equals(row.id, employeeId),
  });
  if (!employee) {
    return { error: NextResponse.json({ error: `${label} ${employeeId} not found.` }, { status: 422 }) };
  }
  if (employee.companyId !== companyId) {
    return {
      error: NextResponse.json(
        { error: `${label} ${employeeId} does not belong to the current company.` },
        { status: 422 },
      ),
    };
  }
  return { employee };
}

async function validateSchedule(scheduleId, companyId) {
  if (scheduleId == null) return { schedule: null };
  const schedule = await db.query.workingSchedules.findFirst({
    columns: { id: true, companyId: true },
    where: (row, { eq: equals }) => equals(row.id, scheduleId),
  });
  if (!schedule) {
    return {
      error: NextResponse.json({ error: `Working schedule ${scheduleId} not found.` }, { status: 422 }),
    };
  }
  if (schedule.companyId !== companyId) {
    return {
      error: NextResponse.json(
        { error: `Working schedule ${scheduleId} does not belong to the current company.` },
        { status: 422 },
      ),
    };
  }
  return { schedule };
}

function validateClockOrder(clockIn, clockOut) {
  if (clockOut && !clockIn) {
    return NextResponse.json(
      { error: 'clock_in is required when clock_out is provided.' },
      { status: 422 },
    );
  }
  if (!hasClockOrder(clockIn, clockOut)) {
    return NextResponse.json(
      { error: 'clock_out must be after clock_in.' },
      { status: 422 },
    );
  }
  return null;
}

function toDbValues(data, companyDefaults = {}) {
  return {
    employeeId: data.employee_id,
    workingScheduleId: data.working_schedule_id ?? null,
    attendanceDate: data.attendance_date,
    clockIn: data.clock_in ? new Date(data.clock_in) : null,
    clockOut: data.clock_out ? new Date(data.clock_out) : null,
    breaksDurationMinutes: data.breaks_duration_minutes ?? 0,
    workHours: data.work_hours != null ? String(data.work_hours) : null,
    overtimeHours: data.overtime_hours != null ? String(data.overtime_hours) : '0',
    status: data.status ?? 'present',
    source: data.source ?? 'manual',
    notes: data.notes?.trim() || null,
    approvedById: data.approved_by_id ?? null,
    approvedAt: data.approved_at ? new Date(data.approved_at) : null,
    ...companyDefaults,
  };
}

export async function GET(request) {
  const { error } = await requirePermission('attendance:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({
        attendances: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
      });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200', 10) || 200));
    const offset = (page - 1) * limit;
    const filters = [eq(employees.companyId, companyId)];

    const employeeId = searchParams.get('employee_id') || searchParams.get('employeeId');
    if (employeeId) {
      const numPart = Number(String(employeeId).replace(/\D/g, ''));
      if (Number.isInteger(numPart) && numPart > 0) {
        filters.push(eq(attendances.employeeId, numPart));
      }
    }

    const exactDate = searchParams.get('date');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const dateSchema = z.string().date();
    const parsedExactDate = exactDate ? dateSchema.safeParse(exactDate) : null;
    const parsedDateFrom = dateFrom ? dateSchema.safeParse(dateFrom) : null;
    const parsedDateTo = dateTo ? dateSchema.safeParse(dateTo) : null;
    if (parsedExactDate && !parsedExactDate.success) {
      return NextResponse.json({ error: 'date must be a valid YYYY-MM-DD date.' }, { status: 400 });
    }
    if (parsedDateFrom && !parsedDateFrom.success) {
      return NextResponse.json({ error: 'date_from must be a valid YYYY-MM-DD date.' }, { status: 400 });
    }
    if (parsedDateTo && !parsedDateTo.success) {
      return NextResponse.json({ error: 'date_to must be a valid YYYY-MM-DD date.' }, { status: 400 });
    }
    if (exactDate && (dateFrom || dateTo)) {
      return NextResponse.json({ error: 'Use either date or date_from/date_to, not both.' }, { status: 400 });
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json({ error: 'date_from must be on or before date_to.' }, { status: 400 });
    }
    if (exactDate) filters.push(eq(attendances.attendanceDate, exactDate));
    if (dateFrom) filters.push(gte(attendances.attendanceDate, dateFrom));
    if (dateTo) filters.push(lte(attendances.attendanceDate, dateTo));

    const status = searchParams.get('status');
    if (status) {
      if (!attendanceStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid attendance status.' }, { status: 400 });
      }
      filters.push(eq(attendances.status, status));
    }

    const whereClause = and(...filters);
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(attendances)
      .innerJoin(employees, eq(attendances.employeeId, employees.id))
      .where(whereClause);
    const rows = await db
      .select(attendanceColumns)
      .from(attendances)
      .innerJoin(employees, eq(attendances.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(attendances.attendanceDate), desc(attendances.clockIn), desc(attendances.id))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      attendances: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error('GET /api/attendance failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('attendance:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createAttendanceSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid attendance payload.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const clockError = validateClockOrder(data.clock_in, data.clock_out);
  if (clockError) return clockError;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: 'Company profile must be set up before creating attendance.' }, { status: 409 });
    }

    const employeeResult = await validateEmployee(data.employee_id, companyId);
    if (employeeResult.error) return employeeResult.error;
    const scheduleResult = await validateSchedule(data.working_schedule_id, companyId);
    if (scheduleResult.error) return scheduleResult.error;
    if (data.approved_by_id != null) {
      const approverResult = await validateEmployee(data.approved_by_id, companyId, 'Approving employee');
      if (approverResult.error) return approverResult.error;
    }

    const [attendance] = await db
      .insert(attendances)
      .values(toDbValues(data))
      .returning(attendanceColumns);
    return NextResponse.json({ attendance }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505') {
      return NextResponse.json(
        { error: 'An attendance record already exists for this employee and date.' },
        { status: 409 },
      );
    }
    if (pgCode === '23503') {
      return NextResponse.json({ error: 'Attendance references a record that does not exist.' }, { status: 409 });
    }
    console.error('POST /api/attendance failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
