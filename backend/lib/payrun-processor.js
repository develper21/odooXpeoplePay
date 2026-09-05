// Server-only payrun processing service.
// Rebuilds draft/processing payslips transactionally so retries are safe.

import 'server-only';

import { and, eq, gte, isNotNull, isNull, lte, or } from 'drizzle-orm';

import { calculateEmployeeSalary, SalaryCalculationError } from '@/lib/salary-calculator';
import { db } from '@/lib/db';
import { contracts, employees, payslipLines, payslips, payruns, salaryStructures } from '@/lib/schema';

export class PayrunProcessingError extends Error {
  constructor(message, status = 422, code = 'PAYRUN_PROCESSING_ERROR') {
    super(message);
    this.name = 'PayrunProcessingError';
    this.status = status;
    this.code = code;
  }
}

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

export async function getEligibleEmployeeIds(payrun, companyId) {
  const candidates = await db
    .select({ employeeId: employees.id })
    .from(employees)
    .innerJoin(contracts, eq(contracts.employeeId, employees.id))
    .innerJoin(salaryStructures, eq(contracts.salaryStructureId, salaryStructures.id))
    .where(and(
      eq(employees.companyId, companyId),
      eq(employees.status, 'active'),
      eq(contracts.companyId, companyId),
      eq(contracts.status, 'active'),
      eq(contracts.payFrequency, payrun.pay_frequency),
      isNotNull(contracts.salaryStructureId),
      eq(salaryStructures.status, 'active'),
      lte(contracts.startDate, payrun.pay_period_end),
      or(isNull(contracts.endDate), gte(contracts.endDate, payrun.pay_period_start)),
    ));
  return candidates.map((candidate) => candidate.employeeId);
}

async function calculateEmployees(payrun, companyId) {
  const results = [];
  const skipped = [];
  for (const employeeId of await getEligibleEmployeeIds(payrun, companyId)) {
    try {
      results.push(await calculateEmployeeSalary(employeeId, { companyId }));
    } catch (error) {
      if (error instanceof SalaryCalculationError) {
        skipped.push({ employee_id: employeeId, reason: error.message });
      } else {
        throw error;
      }
    }
  }
  if (results.length === 0) throw new PayrunProcessingError('No eligible employees with valid salary configuration were found.');
  return { results, skipped };
}

export async function processPayrun(payrunId, companyId) {
  const [payrun] = await db
    .select(payrunColumns)
    .from(payruns)
    .where(and(eq(payruns.id, payrunId), eq(payruns.companyId, companyId)))
    .limit(1);
  if (!payrun) throw new PayrunProcessingError(`Payrun ${payrunId} not found.`, 404, 'PAYRUN_NOT_FOUND');
  if (!['draft', 'processing'].includes(payrun.status)) {
    throw new PayrunProcessingError(`Payrun ${payrunId} cannot be recalculated after it is ${payrun.status}.`, 409, 'PAYRUN_FINALIZED');
  }

  const { results, skipped } = await calculateEmployees(payrun, companyId);
  const totals = results.reduce((sum, result) => ({
    gross: sum.gross + result.gross_salary,
    deductions: sum.deductions + result.total_deductions,
    employer: sum.employer + result.total_employer_contributions,
    net: sum.net + result.net_salary,
  }), { gross: 0, deductions: 0, employer: 0, net: 0 });

  // Neon HTTP does not provide Drizzle interactive transactions. Keep the
  // sequence idempotent: retries always remove and rebuild this payrun's rows.
  await db.delete(payslips).where(eq(payslips.payrunId, payrunId));
  const [processed] = await db
      .update(payruns)
      .set({
        grossTotal: totals.gross.toFixed(2),
        deductionTotal: totals.deductions.toFixed(2),
        employerContributionTotal: totals.employer.toFixed(2),
        netTotal: totals.net.toFixed(2),
        employeeCount: results.length,
        status: 'processing',
      })
      .where(and(eq(payruns.id, payrunId), eq(payruns.companyId, companyId), eq(payruns.status, payrun.status)))
      .returning(payrunColumns);
  if (!processed) throw new PayrunProcessingError(`Payrun ${payrunId} was changed while processing.`, 409, 'PAYRUN_CHANGED');

  for (const result of results) {
    const [payslip] = await db.insert(payslips).values({
        payrunId,
        employeeId: result.employee_id,
        contractId: result.contract_id,
        salaryStructureId: result.salary_structure_id,
        grossAmount: result.gross_salary.toFixed(2),
        deductionAmount: result.total_deductions.toFixed(2),
        taxAmount: '0',
        employerContributionAmount: result.total_employer_contributions.toFixed(2),
        netAmount: result.net_salary.toFixed(2),
        status: 'processing',
    }).returning({ id: payslips.id });
    const lines = [...result.earnings, ...result.deductions, ...result.employer_contributions];
    if (lines.length) await db.insert(payslipLines).values(lines.map((line) => ({
        payslipId: payslip.id,
        salaryRuleId: line.rule_id,
        name: line.name,
        type: line.type,
        calculationType: line.calculation_type,
        amount: line.amount.toFixed(2),
        quantity: '1',
        rate: null,
        isTaxable: line.is_taxable,
        autoComputed: true,
        sortOrder: line.computation_order,
    })));
    }

  return { payrun: processed, skipped_employees: skipped };
}
