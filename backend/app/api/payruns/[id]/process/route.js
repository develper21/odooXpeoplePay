// POST /api/payruns/:id/process
// Processes or safely retries a draft/processing payrun.

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { requirePermission } from '@/lib/auth-guard';
import { PayrunProcessingError, processPayrun } from '@/lib/payrun-processor';
import { db } from '@/lib/db';
import { payslips, payruns } from '@/lib/schema';

const payrunColumns = {
  id: payruns.id,
  company_id: payruns.companyId,
  name: payruns.name,
  pay_period_start: payruns.payPeriodStart,
  pay_period_end: payruns.payPeriodEnd,
  payment_date: payruns.paymentDate,
  pay_frequency: payruns.payFrequency,
  currency: payruns.currency,
  gross_total: payruns.grossTotal,
  deduction_total: payruns.deductionTotal,
  employer_contribution_total: payruns.employerContributionTotal,
  net_total: payruns.netTotal,
  employee_count: payruns.employeeCount,
  status: payruns.status,
  approved_by_id: payruns.approvedById,
  approved_at: payruns.approvedAt,
  paid_at: payruns.paidAt,
  notes: payruns.notes,
  created_at: payruns.createdAt,
  updated_at: payruns.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

async function getPayrun(id, companyId) {
  const [payrun] = await db.select(payrunColumns).from(payruns).where(and(eq(payruns.id, id), eq(payruns.companyId, companyId))).limit(1);
  if (!payrun) return null;
  const payslipRows = await db.select({ id: payslips.id, employee_id: payslips.employeeId, gross_amount: payslips.grossAmount, deduction_amount: payslips.deductionAmount, employer_contribution_amount: payslips.employerContributionAmount, net_amount: payslips.netAmount, status: payslips.status }).from(payslips).where(eq(payslips.payrunId, id));
  return { ...payrun, payslips: payslipRows };
}

export async function POST(_request, { params }) {
  const { error } = await requirePermission('payroll:write');
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid payrun id.' }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Payrun ${id} not found.` }, { status: 404 });
    const result = await processPayrun(id, companyId);
    return NextResponse.json({ payrun: await getPayrun(id, companyId), skipped_employees: result.skipped_employees });
  } catch (err) {
    if (err instanceof PayrunProcessingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/payruns/:id/process failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
