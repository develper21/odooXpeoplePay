// GET /api/payslips/:id/pdf
// Downloads a PDF for a finalized payslip.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { createPayslipPdf } from '@/lib/payslip-pdf';
import { db } from '@/lib/db';
import { companies, employees, payslipLines, payslips, payruns } from '@/lib/schema';

async function getCompanyId() {
  const company = await db.query.companies.findFirst({ columns: { id: true }, orderBy: (row, { asc }) => asc(row.id) });
  return company?.id ?? null;
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('payroll:read');
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
    if (!['approved', 'paid'].includes(data.payslip.status) || !['approved', 'paid'].includes(data.payrun.status)) {
      return NextResponse.json({ error: 'PDF is available only for finalized payslips and payruns.' }, { status: 409 });
    }
    const lines = await db.select({
      id: payslipLines.id,
      name: payslipLines.name,
      type: payslipLines.type,
      amount: payslipLines.amount,
      sort_order: payslipLines.sortOrder,
    }).from(payslipLines).where(eq(payslipLines.payslipId, id)).orderBy(asc(payslipLines.sortOrder), asc(payslipLines.id));
    const pdf = await createPayslipPdf({ ...data, lines });
    const filename = `payslip-${data.employee.employeeCode}-${data.payrun.payPeriodStart}.pdf`;
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
