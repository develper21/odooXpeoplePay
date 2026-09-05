// POST /api/payslips/:id/email
// Sends a finalized payslip PDF to the employee's stored email address.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { sendFinalizedPayslipEmail } from '@/lib/payslip-email';
import { db } from '@/lib/db';
import { companies, employees, payslipLines, payslips, payruns } from '@/lib/schema';

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
    const [data] = await db.select({ payslip: payslips, payrun: payruns, employee: employees, company: companies })
      .from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .innerJoin(companies, eq(payruns.companyId, companies.id))
      .where(and(eq(payslips.id, id), eq(payruns.companyId, companyId)))
      .limit(1);
    if (!data) return NextResponse.json({ error: `Payslip ${id} not found.` }, { status: 404 });
    if (!['approved', 'paid'].includes(data.payslip.status) || !['approved', 'paid'].includes(data.payrun.status)) return NextResponse.json({ error: 'Only finalized payslips can be emailed.' }, { status: 409 });
    if (!data.employee.email) return NextResponse.json({ error: 'Employee email is not available.' }, { status: 422 });
    const lines = await db.select({ id: payslipLines.id, name: payslipLines.name, type: payslipLines.type, amount: payslipLines.amount, sort_order: payslipLines.sortOrder }).from(payslipLines).where(eq(payslipLines.payslipId, id)).orderBy(asc(payslipLines.sortOrder), asc(payslipLines.id));
    await sendFinalizedPayslipEmail({ ...data, lines });
    return NextResponse.json({ ok: true, message: 'Payslip email sent successfully.' });
  } catch (err) {
    console.error('POST /api/payslips/:id/email failed:', err instanceof Error ? err.message : 'unknown error');
    return NextResponse.json({ error: 'Unable to send payslip email.' }, { status: 500 });
  }
}
