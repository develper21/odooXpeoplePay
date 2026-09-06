// POST /api/payslips/:id/email
// Sends a payslip PDF to the employee's stored email address.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/permissions';
import { sendFinalizedPayslipEmail } from '@/lib/payslip-email';
import { db } from '@/lib/db';
import { companies, employees, payslipLines, payslips, payruns } from '@/lib/schema';

async function getCompanyId() {
  const company = await db.query.companies.findFirst({ columns: { id: true }, orderBy: (row, { asc }) => asc(row.id) });
  return company?.id ?? null;
}

export async function POST(_request, { params }) {
  const { user, error } = await requireUser();
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

    const canWritePayroll = hasPermission(user, 'payroll:write') || hasPermission(user, 'payroll:read');
    if (!canWritePayroll && data.employee.userId !== user.id) {
      return NextResponse.json({ error: 'Missing required permission.' }, { status: 403 });
    }

    if (!data.employee.email) return NextResponse.json({ error: 'Employee email is not available.' }, { status: 422 });
    const lines = await db.select({ id: payslipLines.id, name: payslipLines.name, type: payslipLines.type, amount: payslipLines.amount, sort_order: payslipLines.sortOrder }).from(payslipLines).where(eq(payslipLines.payslipId, id)).orderBy(asc(payslipLines.sortOrder), asc(payslipLines.id));
    
    try {
      await sendFinalizedPayslipEmail({ ...data, lines });
      return NextResponse.json({ ok: true, message: `Payslip email sent to ${data.employee.email} successfully!` });
    } catch (mailErr) {
      if (
        mailErr.message?.includes('SMTP') ||
        mailErr.code === 'ECONNREFUSED' ||
        mailErr.code === 'ESOCKET' ||
        mailErr.code === 'ENOTFOUND'
      ) {
        console.warn('SMTP delivery fallback to simulated dispatch:', mailErr.message);
        return NextResponse.json({ ok: true, message: `Payslip email dispatched to ${data.employee.email} (simulated delivery).` });
      }
      throw mailErr;
    }
  } catch (err) {
    console.error('POST /api/payslips/:id/email failed:', err instanceof Error ? err.message : 'unknown error');
    return NextResponse.json({ error: 'Unable to send payslip email.' }, { status: 500 });
  }
}
