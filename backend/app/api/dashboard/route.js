// Company-scoped HRMS dashboard summary from live database aggregates.

import { and, asc, count, eq, gte, gt, lte, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import {
  attendances,
  companies,
  contracts,
  departments,
  employees,
  jobPositions,
  payruns,
  timeOffRequests,
} from '@/lib/schema';

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

const filterSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must use YYYY-MM format.').optional(),
});

export async function GET(request) {
  const { error } = await requirePermission('employees:read');
  if (error) return error;

  const filter = filterSchema.safeParse({ month: new URL(request.url).searchParams.get('month') ?? undefined });
  if (!filter.success) {
    return NextResponse.json({ error: 'Invalid dashboard filter.', issues: filter.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });
  }
  const selectedMonth = filter.data.month ?? new Date().toISOString().slice(0, 7);
  const [year, month] = selectedMonth.split('-').map(Number);
  const periodStart = `${selectedMonth}-01`;
  const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({
        company: null,
        employees: { total: 0, active: 0, inactive_or_terminated: 0 },
        department_count: 0,
        job_position_count: 0,
        pending_time_off_requests: 0,
        attendance: { period: selectedMonth, total: 0, by_status: [] },
        time_off: { period: selectedMonth, total: 0, by_status: [], requested_days: 0 },
        departments: [],
        payruns: { period: selectedMonth, total: 0, by_status: [] },
        latest_payrun: null,
        upcoming_contracts: [],
      });
    }

    const [company, employeeCounts, departmentCount, positionCount, departmentStats, pendingLeave, timeOffByStatus, timeOffDays, attendanceTotal, attendanceByStatus, payrunStats, latestPayrun, upcomingContracts] = await Promise.all([
      db.select({ id: companies.id, name: companies.name, legal_name: companies.legalName, currency: companies.currency }).from(companies).where(eq(companies.id, companyId)).limit(1),
      db.select({ status: employees.status, count: count() }).from(employees).where(eq(employees.companyId, companyId)).groupBy(employees.status),
      db.select({ count: count() }).from(departments).where(eq(departments.companyId, companyId)),
      db.select({ count: count() }).from(jobPositions).where(eq(jobPositions.companyId, companyId)),
      db.select({ id: departments.id, name: departments.name, employee_count: count(employees.id) }).from(departments).leftJoin(employees, eq(employees.departmentId, departments.id)).where(eq(departments.companyId, companyId)).groupBy(departments.id, departments.name).orderBy(asc(departments.name)),
      db.select({ count: count() }).from(timeOffRequests).where(and(eq(timeOffRequests.companyId, companyId), eq(timeOffRequests.status, 'pending'))),
      db.select({ status: timeOffRequests.status, count: count() }).from(timeOffRequests).where(and(eq(timeOffRequests.companyId, companyId), lte(timeOffRequests.startDate, periodEnd), gte(timeOffRequests.endDate, periodStart))).groupBy(timeOffRequests.status),
      db.select({ days: sql`COALESCE(SUM(${timeOffRequests.daysRequested}), 0)` }).from(timeOffRequests).where(and(eq(timeOffRequests.companyId, companyId), lte(timeOffRequests.startDate, periodEnd), gte(timeOffRequests.endDate, periodStart))),
      db.select({ count: count() }).from(attendances).innerJoin(employees, eq(attendances.employeeId, employees.id)).where(and(eq(employees.companyId, companyId), gte(attendances.attendanceDate, periodStart), lte(attendances.attendanceDate, periodEnd))),
      db.select({ status: attendances.status, count: count() }).from(attendances).innerJoin(employees, eq(attendances.employeeId, employees.id)).where(and(eq(employees.companyId, companyId), gte(attendances.attendanceDate, periodStart), lte(attendances.attendanceDate, periodEnd))).groupBy(attendances.status),
      db.select({ status: payruns.status, count: count() }).from(payruns).where(and(eq(payruns.companyId, companyId), lte(payruns.payPeriodStart, periodEnd), gte(payruns.payPeriodEnd, periodStart))).groupBy(payruns.status),
      db.select({ id: payruns.id, name: payruns.name, pay_period_start: payruns.payPeriodStart, pay_period_end: payruns.payPeriodEnd, payment_date: payruns.paymentDate, status: payruns.status, currency: payruns.currency, gross_total: payruns.grossTotal, deduction_total: payruns.deductionTotal, employer_contribution_total: payruns.employerContributionTotal, net_total: payruns.netTotal, employee_count: payruns.employeeCount }).from(payruns).where(and(eq(payruns.companyId, companyId), lte(payruns.payPeriodEnd, periodEnd))).orderBy(sql`${payruns.payPeriodEnd} DESC`, sql`${payruns.id} DESC`).limit(1),
      db.select({ id: contracts.id, employee_id: contracts.employeeId, title: contracts.title, start_date: contracts.startDate, end_date: contracts.endDate, status: contracts.status }).from(contracts).innerJoin(employees, eq(contracts.employeeId, employees.id)).where(and(eq(contracts.companyId, companyId), eq(employees.companyId, companyId), or(gte(contracts.startDate, periodStart), and(gte(contracts.endDate, periodStart), lte(contracts.endDate, periodEnd))))).orderBy(asc(contracts.startDate), asc(contracts.endDate)).limit(10),
    ]);

    const totalEmployees = employeeCounts.reduce((total, row) => total + Number(row.count), 0);
    const activeEmployees = employeeCounts.find((row) => row.status === 'active');
    const activeCount = Number(activeEmployees?.count ?? 0);

    return NextResponse.json({
      company: company[0] ?? null,
      employees: {
        total: totalEmployees,
        active: activeCount,
        inactive_or_terminated: totalEmployees - activeCount,
        by_status: employeeCounts.map((row) => ({ status: row.status, count: Number(row.count) })),
      },
      department_count: Number(departmentCount[0]?.count ?? 0),
      job_position_count: Number(positionCount[0]?.count ?? 0),
      pending_time_off_requests: Number(pendingLeave[0]?.count ?? 0),
      attendance: {
        period: selectedMonth,
        total: Number(attendanceTotal[0]?.count ?? 0),
        by_status: attendanceByStatus.map((row) => ({ status: row.status, count: Number(row.count) })),
      },
      departments: departmentStats.map((row) => ({ id: row.id, name: row.name, employee_count: Number(row.employee_count) })),
      time_off: {
        period: selectedMonth,
        total: timeOffByStatus.reduce((total, row) => total + Number(row.count), 0),
        by_status: timeOffByStatus.map((row) => ({ status: row.status, count: Number(row.count) })),
        requested_days: Number(timeOffDays[0]?.days ?? 0),
      },
      payruns: { period: selectedMonth, total: payrunStats.reduce((total, row) => total + Number(row.count), 0), by_status: payrunStats.map((row) => ({ status: row.status, count: Number(row.count) })) },
      latest_payrun: latestPayrun[0] ? {
        ...latestPayrun[0],
        payroll_summary: {
          gross_total: latestPayrun[0].gross_total,
          deduction_total: latestPayrun[0].deduction_total,
          employer_contribution_total: latestPayrun[0].employer_contribution_total,
          net_total: latestPayrun[0].net_total,
          employee_count: latestPayrun[0].employee_count,
        },
      } : null,
      upcoming_contracts: upcomingContracts,
    });
  } catch (err) {
    console.error('GET /api/dashboard failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
