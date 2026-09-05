// POST /api/payslips/:id/finalize
// Locks one generated payslip after its parent payrun is finalized.

import { and, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { payslips, payruns } from '@/lib/schema';

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
  const company = await db.query.companies.findFirst({ columns: { id: true }, orderBy: (row, { asc }) => asc(row.id) });
  return company?.id ?? null;
}

export async function POST(_request, { params }) {
  const { error } = await requirePermission('payroll:write');
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid payslip id.' }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Payslip ${id} not found.` }, { status: 404 });
    const [current] = await db.select({ id: payslips.id, status: payslips.status, payrunId: payslips.payrunId, payrunStatus: payruns.status }).from(payslips).innerJoin(payruns, eq(payslips.payrunId, payruns.id)).where(and(eq(payslips.id, id), eq(payruns.companyId, companyId))).limit(1);
    if (!current) return NextResponse.json({ error: `Payslip ${id} not found.` }, { status: 404 });
    if (!['approved', 'paid'].includes(current.payrunStatus)) return NextResponse.json({ error: 'Payslip cannot be finalized before its payrun is finalized.' }, { status: 409 });
    if (current.status === 'approved' || current.status === 'paid') {
      const [payslip] = await db.select(payslipColumns).from(payslips).where(eq(payslips.id, id)).limit(1);
      return NextResponse.json({ payslip });
    }
    if (!['draft', 'processing'].includes(current.status)) return NextResponse.json({ error: `Payslip cannot be finalized from status ${current.status}.` }, { status: 409 });
    const [payslip] = await db.transaction(async (tx) => {
      const [updated] = await tx.update(payslips).set({ status: 'approved' }).where(and(eq(payslips.id, id), eq(payslips.status, current.status))).returning(payslipColumns);
      return [updated];
    });
    if (!payslip) return NextResponse.json({ error: `Payslip ${id} was changed before finalization.` }, { status: 409 });
    return NextResponse.json({ payslip });
  } catch (err) {
    console.error('POST /api/payslips/:id/finalize failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}