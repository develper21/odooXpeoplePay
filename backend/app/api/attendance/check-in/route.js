// POST /api/attendance/check-in
// Opens today's attendance for the authenticated user's linked employee.

import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { attendances, employees } from '@/lib/schema';

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
    orderBy: (row, { asc }) => asc(row.id),
  });
  return company?.id ?? null;
}

export async function POST(_request) {
  const { user, error } = await requirePermission('attendance:write');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: 'Company profile has not been set up yet.' }, { status: 404 });
    }

    const employee = await db.query.employees.findFirst({
      columns: { id: true, companyId: true },
      where: (row, { eq: equals }) => equals(row.userId, user.id),
    });
    if (!employee || employee.companyId !== companyId) {
      return NextResponse.json({ error: 'No employee record is linked to this account.' }, { status: 404 });
    }

    const [attendance] = await db
      .insert(attendances)
      .values({
        employeeId: employee.id,
        attendanceDate: sql`CURRENT_DATE`,
        clockIn: sql`CURRENT_TIMESTAMP`,
        status: 'present',
        source: 'manual',
      })
      .returning(attendanceColumns);

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    const detail = err?.cause?.detail ?? err?.message ?? '';
    if (pgCode === '23505' || /duplicate key/i.test(detail)) {
      return NextResponse.json(
        { error: 'An open attendance record already exists for this employee.' },
        { status: 409 },
      );
    }
    if (pgCode === '23503') {
      return NextResponse.json({ error: 'The linked employee record no longer exists.' }, { status: 409 });
    }
    console.error('POST /api/attendance/check-in failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
