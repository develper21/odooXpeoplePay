// GET /api/payslips/:id/pdf
// Downloads a PDF for a payslip.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/permissions';
import { createPayslipPdf } from '@/lib/payslip-pdf';
import { db } from '@/lib/db';
import { companies, employees, payslipLines, payslips, payruns } from '@/lib/schema';

async function getCompanyId() {
  const company = await db.query.companies.findFirst({ columns: { id: true }, orderBy: (row, { asc }) => asc(row.id) });
  return company?.id ?? null;
}

export async function GET(_request, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid payslip id.' }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Payslip ${id} not found.` }, { status: 404 });
    const [data] = await db.select({
      payslip: payslips,
      payrun: payruns,
      employee: employees,
      company: companies,
    }).from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .innerJoin(companies, eq(payruns.companyId, companies.id))
      .where(and(eq(payslips.id, id), eq(payruns.companyId, companyId)))
      .limit(1);
    if (!data) return NextResponse.json({ error: `Payslip ${id} not found.` }, { status: 404 });

    const canReadPayroll = hasPermission(user, 'payroll:read');
    if (!canReadPayroll && data.employee.userId !== user.id) {
      return NextResponse.json({ error: 'Missing required permission.' }, { status: 403 });
    }

    const lines = await db.select({
      id: payslipLines.id,
      name: payslipLines.name,
      type: payslipLines.type,
      amount: payslipLines.amount,
      sort_order: payslipLines.sortOrder,
    }).from(payslipLines).where(eq(payslipLines.payslipId, id)).orderBy(asc(payslipLines.sortOrder), asc(payslipLines.id));
    
    const pdf = await createPayslipPdf({ ...data, lines });
    const empCode = data.employee.employeeCode || `EMP-${data.employee.id}`;
    const periodStart = data.payrun.payPeriodStart || 'period';
    const filename = `payslip-${empCode}-${periodStart}.pdf`;
    
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (err) {
    console.error('GET /api/payslips/:id/pdf failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
