// Single attendance API: read, update, delete.
// Company scope is enforced through the attendance employee relation.

import { and, eq } from 'drizzle-orm';
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
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

async function findAttendance(id, companyId) {
  const [row] = await db
    .select(attendanceColumns)
    .from(attendances)
    .innerJoin(employees, eq(attendances.employeeId, employees.id))
    .where(and(eq(attendances.id, id), eq(employees.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

async function findRawAttendance(id, companyId) {
  const [row] = await db
    .select()
    .from(attendances)
    .innerJoin(employees, eq(attendances.employeeId, employees.id))
    .where(and(eq(attendances.id, id), eq(employees.companyId, companyId)))
    .limit(1);
  return row?.attendances ?? null;
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

const updateAttendanceSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  working_schedule_id: z.number().int().positive().nullable().optional(),
  attendance_date: z.string().date().optional(),
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
});

async function validateEmployee(employeeId, companyId, label = 'Employee') {
  const employee = await db.query.employees.findFirst({
    columns: { id: true, companyId: true },
    where: (row, { eq: equals }) => equals(row.id, employeeId),
  });
  if (!employee) {
    return NextResponse.json({ error: `${label} ${employeeId} not found.` }, { status: 422 });
  }
  if (employee.companyId !== companyId) {
    return NextResponse.json(
      { error: `${label} ${employeeId} does not belong to the current company.` },
      { status: 422 },
    );
  }
  return null;
}

async function validateSchedule(scheduleId, companyId) {
  if (scheduleId == null) return null;
  const schedule = await db.query.workingSchedules.findFirst({
    columns: { id: true, companyId: true },
    where: (row, { eq: equals }) => equals(row.id, scheduleId),
  });
  if (!schedule) {
    return NextResponse.json({ error: `Working schedule ${scheduleId} not found.` }, { status: 422 });
  }
  if (schedule.companyId !== companyId) {
    return NextResponse.json(
      { error: `Working schedule ${scheduleId} does not belong to the current company.` },
      { status: 422 },
    );
  }
  return null;
}

function validateClockOrder(clockIn, clockOut) {
  if (clockOut && !clockIn) {
    return NextResponse.json(
      { error: 'clock_in is required when clock_out is provided.' },
      { status: 422 },
    );
  }
  if (clockIn && clockOut && new Date(clockOut).getTime() <= new Date(clockIn).getTime()) {
    return NextResponse.json({ error: 'clock_out must be after clock_in.' }, { status: 422 });
  }
  return null;
}

function toDbField(key, value) {
  const fields = {
    employee_id: 'employeeId',
    working_schedule_id: 'workingScheduleId',
    attendance_date: 'attendanceDate',
    clock_in: 'clockIn',
    clock_out: 'clockOut',
    breaks_duration_minutes: 'breaksDurationMinutes',
    work_hours: 'workHours',
    overtime_hours: 'overtimeHours',
    status: 'status',
    source: 'source',
    notes: 'notes',
    approved_by_id: 'approvedById',
    approved_at: 'approvedAt',
  };
  if (key === 'notes') return [fields[key], value?.trim() || null];
  if (key === 'work_hours' || key === 'overtime_hours') return [fields[key], value == null ? null : String(value)];
  if (key === 'clock_in' || key === 'clock_out' || key === 'approved_at') {
    return [fields[key], value ? new Date(value) : null];
  }
  return [fields[key], value];
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('attendance:read');
  if (error) return error;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid attendance id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: 'Attendance not found.' }, { status: 404 });
    const attendance = await findAttendance(id, companyId);
    if (!attendance) return NextResponse.json({ error: `Attendance ${id} not found.` }, { status: 404 });
    return NextResponse.json({ attendance });
  } catch (err) {
    console.error('GET /api/attendance/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('attendance:write');
  if (error) return error;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid attendance id.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (body === null || typeof body !== 'object' || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  }

  const parsed = updateAttendanceSchema.safeParse(body);
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

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Attendance ${id} not found.` }, { status: 404 });
    const existing = await findRawAttendance(id, companyId);
    if (!existing) return NextResponse.json({ error: `Attendance ${id} not found.` }, { status: 404 });

    const data = parsed.data;
    const employeeId = data.employee_id ?? existing.employeeId;
    const scheduleId = data.working_schedule_id !== undefined
      ? data.working_schedule_id
      : existing.workingScheduleId;
    const clockIn = data.clock_in !== undefined ? data.clock_in : existing.clockIn;
    const clockOut = data.clock_out !== undefined ? data.clock_out : existing.clockOut;

    const employeeError = await validateEmployee(employeeId, companyId);
    if (employeeError) return employeeError;
    const scheduleError = await validateSchedule(scheduleId, companyId);
    if (scheduleError) return scheduleError;
    if (data.approved_by_id != null) {
      const approverError = await validateEmployee(data.approved_by_id, companyId, 'Approving employee');
      if (approverError) return approverError;
    }
    const clockError = validateClockOrder(clockIn, clockOut);
    if (clockError) return clockError;

    const updates = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const [field, dbValue] = toDbField(key, value);
      updates[field] = dbValue;
    }

    const [attendance] = await db
      .update(attendances)
      .set(updates)
      .where(
        and(
          eq(attendances.id, id),
          eq(attendances.employeeId, existing.employeeId),
        ),
      )
      .returning(attendanceColumns);
    if (!attendance) return NextResponse.json({ error: `Attendance ${id} not found.` }, { status: 404 });
    return NextResponse.json({ attendance });
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
    console.error('PATCH /api/attendance/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('attendance:write');
  if (error) return error;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid attendance id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Attendance ${id} not found.` }, { status: 404 });
    const existing = await findRawAttendance(id, companyId);
    if (!existing) return NextResponse.json({ error: `Attendance ${id} not found.` }, { status: 404 });

    await db
      .delete(attendances)
      .where(and(eq(attendances.id, id), eq(attendances.employeeId, existing.employeeId)));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Attendance ${id} cannot be deleted because other records reference it.` },
        { status: 409 },
      );
    }
    console.error('DELETE /api/attendance/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
