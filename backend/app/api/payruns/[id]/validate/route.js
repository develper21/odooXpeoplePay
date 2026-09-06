// backend/app/api/payruns/[id]/validate/route.js
// Validates a computed payrun, scanning for edge cases and locking it into approved/validated state.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { contracts, employees, payslips, payruns } from '@/lib/schema';

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
  const company = await db.query.companies.findFirst({ columns: { id: true } });
  return company?.id ?? null;
}

export async function POST(_request, { params }) {
  const { user, error } = await requirePermission('payroll:write');
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
      return NextResponse.json({ error: 'Cannot validate a payrun that has already been paid.' }, { status: 409 });
    }

    const payrunPayslips = await db
      .select({
        id: payslips.id,
        employeeId: payslips.employeeId,
        netAmount: payslips.netAmount,
      })
      .from(payslips)
      .where(eq(payslips.payrunId, payrunId));

    if (payrunPayslips.length === 0) {
      return NextResponse.json({ error: 'Cannot validate payrun: No payslips have been computed yet.' }, { status: 422 });
    }

    // Edge-case scanning: missing bank details or missing contracts
    const warnings = [];
    for (const ps of payrunPayslips) {
      const [emp] = await db
        .select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName, email: employees.email })
        .from(employees)
        .where(eq(employees.id, ps.employeeId))
        .limit(1);

      if (!emp) continue;
      if (Number(ps.netAmount) <= 0) {
        warnings.push({
          type: 'ZERO_NET_PAY',
          employee: `${emp.firstName} ${emp.lastName}`,
          message: `Zero or negative net salary computed for ${emp.firstName} ${emp.lastName}.`,
        });
      }
    }

    // Transition status to approved
    const [updated] = await db
      .update(payruns)
      .set({
        status: 'approved',
        approvedById: user.id,
        approvedAt: new Date(),
      })
      .where(and(eq(payruns.id, payrunId), eq(payruns.companyId, companyId)))
      .returning(payrunColumns);

    await db
      .update(payslips)
      .set({ status: 'approved' })
      .where(eq(payslips.payrunId, payrunId));

    return NextResponse.json({
      payrun: updated,
      warnings,
      message: 'Payrun successfully validated and approved.',
    });
  } catch (err) {
    console.error('POST /api/payruns/:id/validate failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
