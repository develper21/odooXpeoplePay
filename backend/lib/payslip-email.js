// Server-only Gmail SMTP delivery for finalized payslips.
// SMTP credentials are read only from environment variables.

import 'server-only';

import nodemailer from 'nodemailer';

import { createPayslipPdf } from '@/lib/payslip-pdf';

function smtpConfig() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  if (required.some((name) => !process.env[name])) {
    throw new Error('SMTP configuration is incomplete.');
  }
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error('SMTP_PORT is invalid.');
  return { host: process.env.SMTP_HOST, port, user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, from: process.env.SMTP_FROM };
}

export async function sendFinalizedPayslipEmail(data) {
  const config = smtpConfig();
  const employeeName = `${data.employee.firstName} ${data.employee.lastName}`.trim();
  const period = `${new Date(data.payrun.payPeriodStart).toLocaleDateString('en-IN')} - ${new Date(data.payrun.payPeriodEnd).toLocaleDateString('en-IN')}`;
  const pdf = await createPayslipPdf(data);
  const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, auth: { user: config.user, pass: config.password } });
  await transporter.sendMail({
    from: config.from,
    to: data.employee.email,
    subject: `Payslip for ${period}`,
    text: `Dear ${employeeName},\n\nPlease find attached your finalized payslip for the payroll period ${period}.\n\nRegards,\n${data.company.name}`,
    html: `<p>Dear ${employeeName},</p><p>Please find attached your finalized payslip for the payroll period <strong>${period}</strong>.</p><p>Regards,<br>${data.company.name}</p>`,
    attachments: [{ filename: `payslip-${data.employee.employeeCode}-${data.payrun.payPeriodStart}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });
}
