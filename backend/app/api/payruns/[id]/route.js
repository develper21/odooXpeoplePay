// Single payrun API: read and update draft payruns.

import { and, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

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

async function getCompanyId() {
  const company = await db.query.companies.findFirst({ columns: { id: true }, orderBy: (row, { asc }) => asc(row.id) });
  return company?.id ?? null;
}
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
async function getPayrun(id, companyId) {
  const [payrun] = await db.select(payrunColumns).from(payruns).where(and(eq(payruns.id, id), eq(payruns.companyId, companyId))).limit(1);
  if (!payrun) return null;
  const rows = await db.select(payslipColumns).from(payslips).where(eq(payslips.payrunId, id)).orderBy(payslips.id);
  return { ...payrun, payslips: rows };
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  payment_date: z.string().date().optional(),
  status: z.enum(['draft', 'processing', 'approved', 'paid', 'cancelled']).optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function GET(_request, { params }) {
  const { error } = await requirePermission('payroll:read');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid payrun id.' }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    const payrun = companyId == null ? null : await getPayrun(id, companyId);
    if (!payrun) return NextResponse.json({ error: `Payrun ${id} not found.` }, { status: 404 });
    return NextResponse.json({ payrun });
  } catch (err) {
    console.error('GET /api/payruns/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { user, error } = await requirePermission('payroll:write');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid payrun id.' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (body === null || typeof body !== 'object' || Object.keys(body).length === 0) return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payrun payload.', issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId == null) return NextResponse.json({ error: `Payrun ${id} not found.` }, { status: 404 });
    const existing = await getPayrun(id, companyId);
    if (!existing) return NextResponse.json({ error: `Payrun ${id} not found.` }, { status: 404 });
    if (existing.status !== 'draft') return NextResponse.json({ error: `Payrun ${id} cannot be edited after it is ${existing.status}.` }, { status: 409 });
    if (parsed.data.payment_date && parsed.data.payment_date < existing.pay_period_end) return NextResponse.json({ error: 'payment_date must be on or after pay_period_end.' }, { status: 422 });

    const updates = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.payment_date !== undefined) updates.paymentDate = parsed.data.payment_date;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes?.trim() || null;
    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
      if (parsed.data.status === 'approved' || parsed.data.status === 'paid') {
        updates.approvedById = user.id;
        updates.approvedAt = sql`CURRENT_TIMESTAMP`;
      }
      if (parsed.data.status === 'paid') updates.paidAt = sql`CURRENT_TIMESTAMP`;
    }

    const [updated] = await db.update(payruns).set(updates).where(and(eq(payruns.id, id), eq(payruns.companyId, companyId), eq(payruns.status, 'draft'))).returning(payrunColumns);
    if (!updated) return NextResponse.json({ error: `Payrun ${id} was already processed.` }, { status: 409 });
    return NextResponse.json({ payrun: await getPayrun(id, companyId) });
  } catch (err) {
    console.error('PATCH /api/payruns/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
