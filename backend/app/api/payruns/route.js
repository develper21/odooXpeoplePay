// Payrun collection API. Payslips and lines are generated from the reusable
// salary calculator; statutory values remain configured salary rules.

import { and, asc, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { processPayrun, PayrunProcessingError } from '@/lib/payrun-processor';
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

const payrunSchema = z.object({
  name: z.string().trim().min(1).max(150),
  pay_period_start: z.string().date(),
  pay_period_end: z.string().date(),
  payment_date: z.string().date(),
  pay_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).default('monthly'),
  currency: z.string().trim().toUpperCase().length(3).default('INR'),
  notes: z.string().trim().nullable().optional(),
}).refine((data) => data.pay_period_end >= data.pay_period_start, {
  message: 'pay_period_end must be on or after pay_period_start.',
  path: ['pay_period_end'],
}).refine((data) => data.payment_date >= data.pay_period_end, {
  message: 'payment_date must be on or after pay_period_end.',
  path: ['payment_date'],
});

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

async function getPayslips(payrunId, companyId) {
  return db
    .select(payslipColumns)
    .from(payslips)
    .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
    .where(and(eq(payslips.payrunId, payrunId), eq(payruns.companyId, companyId)))
    .orderBy(asc(payslips.id));
}

async function getPayrun(id, companyId) {
  const [payrun] = await db.select(payrunColumns).from(payruns).where(and(eq(payruns.id, id), eq(payruns.companyId, companyId))).limit(1);
  if (!payrun) return null;
  return { ...payrun, payslips: await getPayslips(id, companyId) };
}

export async function GET(request) {
  const { error } = await requirePermission('payroll:read');
  if (error) return error;
  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ payruns: [] });
    const rows = await db.select(payrunColumns).from(payruns).where(eq(payruns.companyId, companyId)).orderBy(asc(payruns.payPeriodStart), asc(payruns.id));
    return NextResponse.json({ payruns: rows });
  } catch (err) {
    console.error('GET /api/payruns failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('payroll:write');
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const parsed = payrunSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payrun payload.', issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });
  const companyId = await getCompanyId();
  if (companyId === null) return NextResponse.json({ error: 'Company profile must be set up before creating payruns.' }, { status: 409 });

  try {
    const [created] = await db.insert(payruns).values({
        companyId,
        name: parsed.data.name,
        payPeriodStart: parsed.data.pay_period_start,
        payPeriodEnd: parsed.data.pay_period_end,
        paymentDate: parsed.data.payment_date,
        payFrequency: parsed.data.pay_frequency,
        currency: parsed.data.currency,
        grossTotal: '0',
        deductionTotal: '0',
        employerContributionTotal: '0',
        netTotal: '0',
        employeeCount: 0,
        status: 'draft',
        notes: parsed.data.notes?.trim() || null,
      }).returning({ id: payruns.id });
    const processed = await processPayrun(created.id, companyId);
    return NextResponse.json({ payrun: await getPayrun(created.id, companyId), skipped_employees: processed.skipped_employees }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) return NextResponse.json({ error: 'A payrun already exists for this company, pay frequency and payroll period.' }, { status: 409 });
    if (err instanceof PayrunProcessingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('POST /api/payruns failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
