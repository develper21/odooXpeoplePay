// Payslip collection API: company-scoped reads.

import { and, asc, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requireUser } from '@/server/auth-guard';
import { hasPermission } from '@/server/permissions';
import { db } from '@/server/db';
import { employees, payslips, payruns } from '@/server/schema';

const payslipColumns = {
  id: payslips.id,
  payrun_id: payslips.payrunId,
  employee_id: payslips.employeeId,
  contract_id: payslips.contractId,
  salary_structure_id: payslips.salaryStructureId,
  gross_amount: payslips.grossAmount,
  deduction_amount: payslips.deductionAmount,
  tax_amount: payslips.taxAmount,
  employer_contribution_amount: payslips.employerContributionAmount,
  net_amount: payslips.netAmount,
  paid_days: payslips.paidDays,
  unpaid_days: payslips.unpaidDays,
  overtime_amount: payslips.overtimeAmount,
  payment_method: payslips.paymentMethod,
  status: payslips.status,
  paid_at: payslips.paidAt,
  notes: payslips.notes,
  created_at: payslips.createdAt,
  updated_at: payslips.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

export async function GET(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({
        payslips: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
      });
    }
    const searchParams = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200', 10) || 200));
    const filters = [eq(payruns.companyId, companyId)];

    const canReadPayroll = hasPermission(user, 'payroll:read');
    if (!canReadPayroll) {
      const emp = await db.query.employees.findFirst({
        columns: { id: true },
        where: (e, { eq: eqOp }) => eqOp(e.userId, user.id),
      });
      if (!emp) {
        return NextResponse.json({
          payslips: [],
          pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
        });
      }
      filters.push(eq(payslips.employeeId, emp.id));
    }

    const payrunId = searchParams.get('payrun_id');
    const employeeId = searchParams.get('employee_id');
    if (payrunId) {
      const value = Number(payrunId);
      if (!Number.isInteger(value) || value <= 0) {
        return NextResponse.json({ error: 'payrun_id must be a positive integer.' }, { status: 400 });
      }
      filters.push(eq(payslips.payrunId, value));
    }
    if (employeeId && canReadPayroll) {
      const numPart = Number(String(employeeId).replace(/\D/g, ''));
      if (Number.isInteger(numPart) && numPart > 0) {
        filters.push(eq(payslips.employeeId, numPart));
      }
    }
    const status = searchParams.get('status');
    if (status) filters.push(eq(payslips.status, status.toLowerCase()));
    const where = and(...filters);
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .where(where);
    const rows = await db
      .select({ ...payslipColumns, period: payruns.name })
      .from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .where(where)
      .orderBy(asc(payslips.id))
      .limit(limit)
      .offset((page - 1) * limit);
    return NextResponse.json({
      payslips: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error('GET /api/payslips failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
