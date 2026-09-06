// Server-only PDF renderer for finalized payslips.
// This service renders stored values and never recalculates payroll.

import 'server-only';

import PDFDocument from 'pdfkit';

function money(value, currency) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(amount);
}

function date(value) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '-';
}

function section(document, title, rows, currency) {
  document.fontSize(11).fillColor('#17324d').text(title, 50, document.y, { underline: true });
  document.moveDown(0.35);
  for (const row of rows) {
    document.fontSize(10).fillColor('#222').text(row.name, 60, document.y, { continued: true });
    document.text(money(row.amount, currency), { align: 'right' });
  }
  document.moveDown(0.5);
}

export function createPayslipPdf(data) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Payslip ${data.payslip.id}` } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    const currency = data.payrun.currency || 'INR';
    const earnings = data.lines.filter((line) => line.type === 'earning');
    const deductions = data.lines.filter((line) => line.type === 'deduction');
    const employer = data.lines.filter((line) => line.type === 'employer_contribution');

    document.fontSize(20).fillColor('#17324d').text(data.company.name || 'Company', { align: 'center' });
    document.fontSize(9).fillColor('#555').text([data.company.legalName, data.company.address, data.company.city, data.company.state, data.company.country].filter(Boolean).join(' | '), { align: 'center' });
    document.moveDown(0.5);
    document.fontSize(15).fillColor('#17324d').text('SALARY SLIP', { align: 'center' });
    document.fontSize(10).fillColor('#222').text(`Pay period: ${date(data.payrun.payPeriodStart)} - ${date(data.payrun.payPeriodEnd)}    Payment date: ${date(data.payrun.paymentDate)}`, { align: 'center' });
    document.moveDown(1);

    document.fontSize(10).fillColor('#222');
    document.text(`Employee: ${data.employee.firstName} ${data.employee.lastName}`);
    document.text(`Employee code: ${data.employee.employeeCode}`);
    document.text(`Payslip ID: ${data.payslip.id}    Payrun: ${data.payrun.name}`);
    document.moveDown(0.8);

    section(document, 'Earnings', earnings, currency);
    document.fontSize(11).fillColor('#17324d').text('Gross Salary', 60, document.y, { continued: true });
    document.text(money(data.payslip.grossAmount, currency), { align: 'right' });
    document.moveDown(0.8);

    section(document, 'Deductions', deductions, currency);
    document.fontSize(11).fillColor('#17324d').text('Net / In-hand Salary', 60, document.y, { continued: true });
    document.text(money(data.payslip.netAmount, currency), { align: 'right' });
    document.moveDown(0.8);

    if (employer.length) {
      section(document, 'Employer Contributions', employer, currency);
    }
    document.fontSize(11).fillColor('#17324d').text('Employer CTC', 60, document.y, { continued: true });
    document.text(money(Number(data.payslip.grossAmount) + Number(data.payslip.employerContributionAmount), currency), { align: 'right' });
    document.moveDown(1.2);
    document.fontSize(8).fillColor('#666').text('This document is generated from finalized payroll records. Statutory components reflect configured salary rules.', { align: 'center' });
    document.end();
  });
}
