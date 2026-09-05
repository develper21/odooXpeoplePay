// POST /api/payruns/:id/finalize
// Finalizes a calculated payrun and locks its payroll records.

import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { getEligibleEmployeeIds, PayrunProcessingError } from '@/lib/payrun-processor';
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
const payslipColumns = {
  id: payslips.id,
  payrun_id: payslips.payrunId,
  employee_id: payslips.employeeId,
  contract_id: payslips.contractId,
  salary_structure_id: payslips.salaryStructureId,
  gross_amount: payslips.grossAmount,
  deduction_amount: payslips.deductionAmount,
  employer_contribution_amount: payslips.employerContributionAmount,
  net_amount: payslips.netAmount,
  status: payslips.status,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

async function findPayrun(id, companyId) {
  const [payrun] = await db.select(payrunColumns).from(payruns).where(and(eq(payruns.id, id), eq(payruns.companyId, companyId))).limit(1);
  return payrun;
}

async function getFinalizedResponse(id, companyId) {
  const payrun = await findPayrun(id, companyId);
  if (!payrun) return null;
  const payrunPayslips = await db.select(payslipColumns).from(payslips).where(eq(payslips.payrunId, id)).orderBy(asc(payslips.id));
  return { ...payrun, payslips: payrunPayslips };
}

export async function POST(_request, { params }) {
  const { user, error } = await requirePermission('payroll:write');
  if (error) return error;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid payrun id.' }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Payrun ${id} not found.` }, { status: 404 });
    const payrun = await findPayrun(id, companyId);
    if (!payrun) return NextResponse.json({ error: `Payrun ${id} not found.` }, { status: 404 });

    if (payrun.status === 'approved' || payrun.status === 'paid') {
      return NextResponse.json({ payrun: await getFinalizedResponse(id, companyId) });
    }
    if (!['draft', 'processing'].includes(payrun.status)) {
      return NextResponse.json({ error: `Payrun ${id} cannot be finalized from status ${payrun.status}.` }, { status: 409 });
    }

    const eligibleEmployeeIds = await getEligibleEmployeeIds(payrun, companyId);
    if (eligibleEmployeeIds.length === 0) {
      return NextResponse.json({ error: 'No eligible employees were found for this payrun.' }, { status: 422 });
    }
    const existingPayslips = await db.select({ employeeId: payslips.employeeId, status: payslips.status }).from(payslips).where(eq(payslips.payrunId, id));
    const payslipIds = new Set(existingPayslips.map((payslip) => payslip.employeeId));
    const missing = eligibleEmployeeIds.filter((employeeId) => !payslipIds.has(employeeId));
    if (missing.length > 0 || existingPayslips.length !== eligibleEmployeeIds.length) {
      return NextResponse.json({ error: 'Payrun cannot be finalized because employee payroll records are incomplete.', missing_employee_ids: missing }, { status: 422 });
    }
    if (existingPayslips.some((payslip) => !['draft', 'processing'].includes(payslip.status))) {
      return NextResponse.json({ error: 'Payrun contains payroll records in an invalid status for finalization.' }, { status: 409 });
    }

    // Neon HTTP does not support interactive Drizzle transactions. The
    // guarded status update keeps retries idempotent for this two-step lock.
    const [finalized] = await db.update(payruns).set({
        status: 'approved',
        approvedById: user.id,
        approvedAt: sql`CURRENT_TIMESTAMP`,
      }).where(and(eq(payruns.id, id), eq(payruns.companyId, companyId), inArray(payruns.status, ['draft', 'processing']))).returning(payrunColumns);
    if (finalized) await db.update(payslips).set({ status: 'approved' }).where(eq(payslips.payrunId, id));

    if (!finalized) {
      const current = await findPayrun(id, companyId);
      if (current?.status === 'approved' || current?.status === 'paid') return NextResponse.json({ payrun: await getFinalizedResponse(id, companyId) });
      return NextResponse.json({ error: `Payrun ${id} was changed before finalization.` }, { status: 409 });
    }
    return NextResponse.json({ payrun: await getFinalizedResponse(id, companyId) });
  } catch (err) {
    if (err instanceof PayrunProcessingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/payruns/:id/finalize failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
