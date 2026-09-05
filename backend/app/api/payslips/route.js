// Payslip collection API: company-scoped reads and single payslip generation.

import { and, asc, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { calculateEmployeeSalary, SalaryCalculationError } from '@/lib/salary-calculator';
import { db } from '@/lib/db';
import { contracts, employees, payslipLines, payslips, payruns } from '@/lib/schema';

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

const generateSchema = z.object({
  employee_id: z.number().int().positive(),
});

export async function GET(request) {
  const { error } = await requirePermission('payroll:read');
  if (error) return error;
  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ payslips: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } });
    const searchParams = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));
    const filters = [eq(payruns.companyId, companyId)];
    const payrunId = searchParams.get('payrun_id');
    const employeeId = searchParams.get('employee_id');
    if (payrunId) {
      const value = Number(payrunId);
      if (!Number.isInteger(value) || value <= 0) return NextResponse.json({ error: 'payrun_id must be a positive integer.' }, { status: 400 });
      filters.push(eq(payslips.payrunId, value));
    }
    if (employeeId) {
      const value = Number(employeeId);
      if (!Number.isInteger(value) || value <= 0) return NextResponse.json({ error: 'employee_id must be a positive integer.' }, { status: 400 });
      filters.push(eq(payslips.employeeId, value));
    }
    const status = searchParams.get('status');
    if (status) filters.push(eq(payslips.status, status));
    const where = and(...filters);
    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(payslips).innerJoin(payruns, eq(payslips.payrunId, payruns.id)).where(where);
    const rows = await db.select(payslipColumns).from(payslips).innerJoin(payruns, eq(payslips.payrunId, payruns.id)).where(where).orderBy(asc(payslips.id)).limit(limit).offset((page - 1) * limit);
    return NextResponse.json({ payslips: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (err) {
    console.error('GET /api/payslips failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function generatePayslip(request, { params }) {
  const { error } = await requirePermission('payroll:write');
  if (error) return error;
  const payrunId = Number((await params).id);
  if (!Number.isInteger(payrunId) || payrunId <= 0) return NextResponse.json({ error: 'Invalid payrun id.' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const parsed = generateSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payslip generation payload.', issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Payrun ${payrunId} not found.` }, { status: 404 });
    const [payrun] = await db.select({ id: payruns.id, companyId: payruns.companyId, status: payruns.status, payPeriodStart: payruns.payPeriodStart, payPeriodEnd: payruns.payPeriodEnd }).from(payruns).where(and(eq(payruns.id, payrunId), eq(payruns.companyId, companyId))).limit(1);
    if (!payrun) return NextResponse.json({ error: `Payrun ${payrunId} not found.` }, { status: 404 });
    if (payrun.status !== 'processing') return NextResponse.json({ error: 'Payslips can only be generated from a calculated payrun before finalization.' }, { status: 409 });
    const [existing] = await db.select({ id: payslips.id }).from(payslips).where(and(eq(payslips.payrunId, payrunId), eq(payslips.employeeId, parsed.data.employee_id))).limit(1);
    if (existing) return NextResponse.json({ error: `Payslip already exists for employee ${parsed.data.employee_id} in payrun ${payrunId}.` }, { status: 409 });
    const [contract] = await db.select({ id: contracts.id, employeeId: contracts.employeeId, companyId: contracts.companyId, startDate: contracts.startDate, endDate: contracts.endDate }).from(contracts).innerJoin(employees, eq(contracts.employeeId, employees.id)).where(and(eq(contracts.employeeId, parsed.data.employee_id), eq(contracts.companyId, companyId), eq(contracts.status, 'active'), eq(employees.status, 'active'), eq(employees.companyId, companyId))).limit(1);
    if (!contract || contract.startDate > payrun.payPeriodEnd || (contract.endDate && contract.endDate < payrun.payPeriodStart)) return NextResponse.json({ error: 'Employee has no eligible active contract for this payrun period.' }, { status: 422 });
    const result = await calculateEmployeeSalary(parsed.data.employee_id, { companyId, contractId: contract.id });
    const status = 'processing';
    const created = await db.transaction(async (tx) => {
      const [payslip] = await tx.insert(payslips).values({ payrunId, employeeId: result.employee_id, contractId: result.contract_id, salaryStructureId: result.salary_structure_id, grossAmount: result.gross_salary.toFixed(2), deductionAmount: result.total_deductions.toFixed(2), taxAmount: '0', employerContributionAmount: result.total_employer_contributions.toFixed(2), netAmount: result.net_salary.toFixed(2), status }).returning(payslipColumns);
      const lines = [...result.earnings, ...result.deductions, ...result.employer_contributions];
      if (lines.length) await tx.insert(payslipLines).values(lines.map((line) => ({ payslipId: payslip.id, salaryRuleId: line.rule_id, name: line.name, type: line.type, calculationType: line.calculation_type, amount: line.amount.toFixed(2), quantity: '1', rate: null, isTaxable: line.is_taxable, autoComputed: true, sortOrder: line.computation_order })));
      return payslip;
    });
    return NextResponse.json({ payslip: created }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505') return NextResponse.json({ error: 'Payslip already exists for this employee and payrun.' }, { status: 409 });
    if (err instanceof SalaryCalculationError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/payslips/:id/generate failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
