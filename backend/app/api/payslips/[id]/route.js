// GET /api/payslips/:id
// Returns one company-scoped payslip with its calculated salary lines.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { employees, payslipLines, payslips, payruns } from '@/lib/schema';

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
const lineColumns = {
  id: payslipLines.id,
  payslip_id: payslipLines.payslipId,
  salary_rule_id: payslipLines.salaryRuleId,
  name: payslipLines.name,
  type: payslipLines.type,
  calculation_type: payslipLines.calculationType,
  amount: payslipLines.amount,
  quantity: payslipLines.quantity,
  rate: payslipLines.rate,
  is_taxable: payslipLines.isTaxable,
  auto_computed: payslipLines.autoComputed,
  sort_order: payslipLines.sortOrder,
  created_at: payslipLines.createdAt,
  updated_at: payslipLines.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({ columns: { id: true }, orderBy: (row, { asc }) => asc(row.id) });
  return company?.id ?? null;
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('payroll:read');
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid payslip id.' }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Payslip ${id} not found.` }, { status: 404 });
    const [payslip] = await db.select({ ...payslipColumns, payrun_status: payruns.status, pay_period_start: payruns.payPeriodStart, pay_period_end: payruns.payPeriodEnd, employee_first_name: employees.firstName, employee_last_name: employees.lastName, employee_code: employees.employeeCode }).from(payslips).innerJoin(payruns, eq(payslips.payrunId, payruns.id)).innerJoin(employees, eq(payslips.employeeId, employees.id)).where(and(eq(payslips.id, id), eq(payruns.companyId, companyId))).limit(1);
    if (!payslip) return NextResponse.json({ error: `Payslip ${id} not found.` }, { status: 404 });
    const lines = await db.select(lineColumns).from(payslipLines).where(eq(payslipLines.payslipId, id)).orderBy(asc(payslipLines.sortOrder), asc(payslipLines.id));
    return NextResponse.json({ payslip: { ...payslip, lines } });
  } catch (err) {
    console.error('GET /api/payslips/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
