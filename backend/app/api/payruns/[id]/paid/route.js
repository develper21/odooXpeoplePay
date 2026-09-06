// backend/app/api/payruns/[id]/paid/route.js
// Finalizes payroll payout and marks payrun and payslips as paid.

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
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
  paid_at: payruns.paidAt,
  notes: payruns.notes,
  created_at: payruns.createdAt,
  updated_at: payruns.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({ columns: { id: true } });
  return company?.id ?? null;
}

export async function POST(_request, { params }) {
  const { error } = await requirePermission('payroll:write');
  if (error) return error;

  const { id } = await params;
  const payrunId = Number(id);
  if (!Number.isInteger(payrunId) || payrunId <= 0) {
    return NextResponse.json({ error: 'Invalid payrun id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Payrun ${payrunId} not found.` }, { status: 404 });

    const [payrun] = await db
      .select(payrunColumns)
      .from(payruns)
      .where(and(eq(payruns.id, payrunId), eq(payruns.companyId, companyId)))
      .limit(1);

    if (!payrun) return NextResponse.json({ error: `Payrun ${payrunId} not found.` }, { status: 404 });

    if (payrun.status === 'paid') {
      return NextResponse.json({ payrun, message: 'Payrun is already marked as paid.' });
    }

    const now = new Date();
    const [updated] = await db
      .update(payruns)
      .set({
        status: 'paid',
        paidAt: now,
      })
      .where(and(eq(payruns.id, payrunId), eq(payruns.companyId, companyId)))
      .returning(payrunColumns);

    await db
      .update(payslips)
      .set({
        status: 'paid',
        paidAt: now,
      })
      .where(eq(payslips.payrunId, payrunId));

    return NextResponse.json({
      payrun: updated,
      message: 'Payrun and child payslips successfully marked as paid.',
    });
  } catch (err) {
    console.error('POST /api/payruns/:id/paid failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
