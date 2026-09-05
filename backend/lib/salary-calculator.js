// Server-only salary calculation service.
// Statutory rates and thresholds come entirely from salary_rules.

import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { contracts, employees, salaryRules, salaryStructures } from '@/lib/schema';

const RULE_TYPES = new Set(['earning', 'deduction', 'employer_contribution']);
const CALCULATION_TYPES = new Set(['fixed', 'percentage']);
const BASES = new Set(['gross', 'basic', 'net']);

export class SalaryCalculationError extends Error {
  constructor(message, status = 422, code = 'SALARY_CALCULATION_ERROR') {
    super(message);
    this.name = 'SalaryCalculationError';
    this.status = status;
    this.code = code;
  }
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function numericValue(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new SalaryCalculationError(`${label} must be a finite number.`);
  }
  return number;
}

function validateRule(rule) {
  if (!rule.name || !rule.code || !RULE_TYPES.has(rule.type)) {
    throw new SalaryCalculationError(`Salary rule ${rule.id} has invalid identity or type.`);
  }
  if (!CALCULATION_TYPES.has(rule.calculationType)) {
    throw new SalaryCalculationError(`Salary rule ${rule.code} has an invalid calculation type.`);
  }
  if (!Number.isInteger(rule.computationOrder) || rule.computationOrder < 0) {
    throw new SalaryCalculationError(`Salary rule ${rule.code} has an invalid computation order.`);
  }
  if (!rule.isActive) return;

  if (rule.calculationType === 'fixed') {
    const amount = numericValue(rule.amount, `Amount for salary rule ${rule.code}`);
    if (amount < 0) throw new SalaryCalculationError(`Amount for salary rule ${rule.code} cannot be negative.`);
    return;
  }

  const percentage = numericValue(rule.percentage, `Percentage for salary rule ${rule.code}`);
  if (percentage < 0 || percentage > 100) {
    throw new SalaryCalculationError(`Percentage for salary rule ${rule.code} must be between 0 and 100.`);
  }
  if (!BASES.has(rule.percentageBase)) {
    throw new SalaryCalculationError(`Salary rule ${rule.code} requires a valid percentage base.`);
  }
}

function resolveBase(rule, totals) {
  if (rule.percentageBase === 'basic') return totals.basic;
  if (rule.percentageBase === 'gross') return totals.gross;
  if (rule.percentageBase === 'net') return totals.gross - totals.deductions;
  throw new SalaryCalculationError(`Salary rule ${rule.code} has no usable percentage base.`);
}

function calculateRuleAmount(rule, totals) {
  if (rule.calculationType === 'fixed') return roundMoney(numericValue(rule.amount, `Amount for salary rule ${rule.code}`));
  const base = resolveBase(rule, totals);
  return roundMoney((base * numericValue(rule.percentage, `Percentage for salary rule ${rule.code}`)) / 100);
}

function sortRules(rules) {
  const typeOrder = { earning: 0, deduction: 1, employer_contribution: 2 };
  return [...rules].sort((left, right) =>
    typeOrder[left.type] - typeOrder[right.type]
    || left.computationOrder - right.computationOrder
    || left.id - right.id,
  );
}

function lineFor(rule, amount) {
  return {
    rule_id: rule.id,
    code: rule.code,
    name: rule.name,
    type: rule.type,
    calculation_type: rule.calculationType,
    amount: roundMoney(amount),
    is_taxable: rule.isTaxable,
    computation_order: rule.computationOrder,
  };
}

async function findEmployeeContract(employeeId, companyId, contractId) {
  const [employee] = await db
    .select({ id: employees.id, companyId: employees.companyId, status: employees.status })
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId)))
    .limit(1);

  if (!employee) throw new SalaryCalculationError(`Employee ${employeeId} not found.`, 404, 'EMPLOYEE_NOT_FOUND');
  if (employee.status !== 'active') throw new SalaryCalculationError(`Employee ${employeeId} is not active.`, 422, 'EMPLOYEE_NOT_ACTIVE');

  const [contract] = await db
    .select({
      id: contracts.id,
      employeeId: contracts.employeeId,
      companyId: contracts.companyId,
      salaryStructureId: contracts.salaryStructureId,
      salaryAmount: contracts.salaryAmount,
      payFrequency: contracts.payFrequency,
      currency: contracts.currency,
      status: contracts.status,
      salaryStructureStatus: salaryStructures.status,
    })
    .from(contracts)
    .leftJoin(salaryStructures, eq(contracts.salaryStructureId, salaryStructures.id))
    .where(and(
      eq(contracts.employeeId, employeeId),
      eq(contracts.companyId, companyId),
      eq(contracts.status, 'active'),
      ...(contractId == null ? [] : [eq(contracts.id, contractId)]),
    ))
    .limit(1);

  if (!contract) throw new SalaryCalculationError(`Employee ${employeeId} has no active contract.`, 422, 'ACTIVE_CONTRACT_NOT_FOUND');
  if (!contract.salaryStructureId) throw new SalaryCalculationError(`Employee ${employeeId} has no assigned salary structure.`, 422, 'SALARY_STRUCTURE_NOT_ASSIGNED');
  if (contract.salaryStructureStatus !== 'active') throw new SalaryCalculationError(`Salary structure ${contract.salaryStructureId} is not active.`, 422, 'SALARY_STRUCTURE_NOT_ACTIVE');

  return contract;
}

export async function calculateEmployeeSalary(employeeId, { companyId, contractId } = {}) {
  const resolvedCompanyId = companyId ?? (await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  }))?.id;
  if (!resolvedCompanyId) throw new SalaryCalculationError('Company profile has not been set up yet.', 404, 'COMPANY_NOT_FOUND');
  if (!Number.isInteger(employeeId) || employeeId <= 0) throw new SalaryCalculationError('employeeId must be a positive integer.', 400, 'INVALID_EMPLOYEE_ID');

  const contract = await findEmployeeContract(employeeId, resolvedCompanyId, contractId);
  const rules = await db
    .select({
      id: salaryRules.id,
      name: salaryRules.name,
      code: salaryRules.code,
      type: salaryRules.type,
      calculationType: salaryRules.calculationType,
      amount: salaryRules.amount,
      percentage: salaryRules.percentage,
      percentageBase: salaryRules.percentageBase,
      isTaxable: salaryRules.isTaxable,
      computationOrder: salaryRules.computationOrder,
      isActive: salaryRules.isActive,
    })
    .from(salaryRules)
    .where(eq(salaryRules.salaryStructureId, contract.salaryStructureId))
    .orderBy(asc(salaryRules.computationOrder), asc(salaryRules.id));

  if (rules.length === 0) throw new SalaryCalculationError(`Salary structure ${contract.salaryStructureId} has no salary rules.`, 422, 'SALARY_RULES_NOT_CONFIGURED');
  rules.forEach(validateRule);
  const activeRules = sortRules(rules.filter((rule) => rule.isActive));
  if (activeRules.length === 0) throw new SalaryCalculationError(`Salary structure ${contract.salaryStructureId} has no active salary rules.`, 422, 'ACTIVE_SALARY_RULES_NOT_CONFIGURED');

  const totals = { basic: 0, gross: 0, deductions: 0, employerContributions: 0 };
  const earnings = [];
  const deductions = [];
  const employerContributions = [];

  for (const rule of activeRules) {
    const amount = calculateRuleAmount(rule, totals);
    const line = lineFor(rule, amount);
    if (rule.type === 'earning') {
      earnings.push(line);
      totals.gross = roundMoney(totals.gross + amount);
      if (rule.code.toUpperCase() === 'BASIC') totals.basic = roundMoney(totals.basic + amount);
    } else if (rule.type === 'deduction') {
      deductions.push(line);
      totals.deductions = roundMoney(totals.deductions + amount);
    } else {
      employerContributions.push(line);
      totals.employerContributions = roundMoney(totals.employerContributions + amount);
    }
  }

  const netSalary = roundMoney(totals.gross - totals.deductions);
  const ctc = roundMoney(totals.gross + totals.employerContributions);
  return {
    employee_id: employeeId,
    contract_id: contract.id,
    salary_structure_id: contract.salaryStructureId,
    currency: contract.currency,
    pay_frequency: contract.payFrequency,
    contract_salary: roundMoney(numericValue(contract.salaryAmount, 'Contract salary amount')),
    basic_salary: roundMoney(totals.basic),
    earnings,
    gross_salary: roundMoney(totals.gross),
    deductions,
    total_deductions: roundMoney(totals.deductions),
    net_salary: netSalary,
    employer_contributions: employerContributions,
    total_employer_contributions: roundMoney(totals.employerContributions),
    ctc,
  };
}
