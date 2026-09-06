// backend/app/api/payruns/[id]/send-payslips/route.js
// Bulk payslip email distribution endpoint for payruns.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-guard';
import { createPayslipPdf } from '@/lib/payslip-pdf';
import { sendFinalizedPayslipEmail } from '@/lib/payslip-email';
import { db } from '@/lib/db';
import { companies, employees, payslipLines, payslips, payruns } from '@/lib/schema';

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

    const [payrunRecord] = await db
      .select()
      .from(payruns)
      .where(and(eq(payruns.id, payrunId), eq(payruns.companyId, companyId)))
      .limit(1);

    if (!payrunRecord) return NextResponse.json({ error: `Payrun ${payrunId} not found.` }, { status: 404 });

    const payrunPayslips = await db
      .select({
        payslip: payslips,
        employee: employees,
        company: companies,
      })
      .from(payslips)
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .innerJoin(companies, eq(employees.companyId, companies.id))
      .where(eq(payslips.payrunId, payrunId));

    if (payrunPayslips.length === 0) {
      return NextResponse.json({ error: 'No payslips available to send for this payrun.' }, { status: 422 });
    }

    let sentCount = 0;
    let failedCount = 0;
    const failures = [];
    let simulated = false;

    // Check if SMTP is configured
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

    for (const item of payrunPayslips) {
      const emp = item.employee;
      const empName = `${emp.firstName} ${emp.lastName}`.trim();

      if (!emp.email || !emp.email.includes('@')) {
        failedCount++;
        failures.push({
          employeeName: empName,
          reason: 'Cannot send payslip — missing or invalid email address.',
        });
        continue;
      }

      // Fetch payslip lines
      const lines = await db
        .select({
          id: payslipLines.id,
          name: payslipLines.name,
          type: payslipLines.type,
          amount: payslipLines.amount,
          sort_order: payslipLines.sortOrder,
        })
        .from(payslipLines)
        .where(eq(payslipLines.payslipId, item.payslip.id))
        .orderBy(asc(payslipLines.sortOrder), asc(payslipLines.id));

      const bundle = {
        payslip: item.payslip,
        payrun: payrunRecord,
        employee: emp,
        company: item.company,
        lines,
      };

      if (hasSmtp) {
        try {
          await sendFinalizedPayslipEmail(bundle);
          sentCount++;
        } catch (mailErr) {
          failedCount++;
          failures.push({
            employeeName: empName,
            reason: mailErr instanceof Error ? mailErr.message : 'SMTP delivery failure.',
          });
        }
      } else {
        // In demo/dev mode without SMTP, generate PDF to verify integrity and simulate dispatch
        try {
          await createPayslipPdf(bundle);
          sentCount++;
          simulated = true;
        } catch (pdfErr) {
          failedCount++;
          failures.push({
            employeeName: empName,
            reason: pdfErr instanceof Error ? pdfErr.message : 'PDF generation failure.',
          });
        }
      }
    }

    return NextResponse.json({
      total: payrunPayslips.length,
      sentCount,
      failedCount,
      failures,
      simulated,
      message: `Bulk payslip dispatch completed. ${sentCount} sent, ${failedCount} failed.${simulated ? ' (Simulated: SMTP server not configured in local environment).' : ''}`,
    });
  } catch (err) {
    console.error('POST /api/payruns/:id/send-payslips failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
