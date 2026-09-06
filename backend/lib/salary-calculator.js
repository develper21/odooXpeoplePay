// Server-only salary calculation service.
// Statutory rates and thresholds come entirely from salary_rules.

import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { contracts, employees, salaryRules, salaryStructures } from '@/lib/schema';

const RULE_TYPES = new Set(['earning', 'deduction', 'employer_contribution', 'basic', 'allowance', 'gross', 'net']);
const CALCULATION_TYPES = new Set(['fixed', 'percentage', 'formula']);
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

function tokenizeFormula(formula) {
  const tokens = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '+') { tokens.push({ type: 'PLUS', value: '+' }); i++; }
    else if (ch === '-') { tokens.push({ type: 'MINUS', value: '-' }); i++; }
    else if (ch === '*') { tokens.push({ type: 'STAR', value: '*' }); i++; }
    else if (ch === '/') { tokens.push({ type: 'SLASH', value: '/' }); i++; }
    else if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; }
    else if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; }
    else if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < formula.length && /[0-9]/.test(formula[i + 1]))) {
      let numStr = '';
      while (i < formula.length && /[0-9.]/.test(formula[i])) { numStr += formula[i]; i++; }
      tokens.push({ type: 'NUMBER', value: Number(numStr) });
    } else if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) { ident += formula[i]; i++; }
      tokens.push({ type: 'IDENTIFIER', value: ident.toUpperCase() });
    } else {
      throw new SalaryCalculationError(`Invalid character "${ch}" in formula`);
    }
  }
  return tokens;
}

function evaluateFormula(formula, scope) {
  const tokens = tokenizeFormula(formula);
  let index = 0;
  function peek() { return tokens[index]; }
  function consume(type) {
    const t = tokens[index];
    if (!t) throw new SalaryCalculationError('Unexpected end of formula');
    if (type && t.type !== type) throw new SalaryCalculationError(`Expected ${type} but got ${t.type}`);
    index++;
    return t;
  }
  function parseExpression() {
    let left = parseTerm();
    while (peek() && (peek().type === 'PLUS' || peek().type === 'MINUS')) {
      const op = consume().type;
      const right = parseTerm();
      left = op === 'PLUS' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (peek() && (peek().type === 'STAR' || peek().type === 'SLASH')) {
      const op = consume().type;
      const right = parseFactor();
      if (op === 'SLASH' && right === 0) throw new SalaryCalculationError('Division by zero in formula');
      left = op === 'STAR' ? left * right : left / right;
    }
    return left;
  }
  function parseFactor() {
    if (peek() && peek().type === 'MINUS') {
      consume();
      return -parseFactor();
    }
    if (peek() && peek().type === 'PLUS') {
      consume();
      return parseFactor();
    }
    const t = consume();
    if (t.type === 'NUMBER') return t.value;
    if (t.type === 'IDENTIFIER') {
      const val = scope[t.value];
      if (val === undefined || isNaN(val)) return 0;
      return val;
    }
    if (t.type === 'LPAREN') {
      const val = parseExpression();
      consume('RPAREN');
      return val;
    }
    throw new SalaryCalculationError(`Unexpected token in formula: ${JSON.stringify(t)}`);
  }
  const result = parseExpression();
  if (index < tokens.length) throw new SalaryCalculationError('Unexpected tokens at end of formula');
  return roundMoney(result);
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
    const amount = numericValue(rule.amount ?? 0, `Amount for salary rule ${rule.code}`);
    if (amount < 0) throw new SalaryCalculationError(`Amount for salary rule ${rule.code} cannot be negative.`);
    return;
  }

  if (rule.calculationType === 'percentage') {
    const percentage = numericValue(rule.percentage ?? 0, `Percentage for salary rule ${rule.code}`);
    if (percentage < 0 || percentage > 100) {
      throw new SalaryCalculationError(`Percentage for salary rule ${rule.code} must be between 0 and 100.`);
    }
    if (!BASES.has(rule.percentageBase)) {
      throw new SalaryCalculationError(`Salary rule ${rule.code} requires a valid percentage base.`);
    }
    return;
  }

  if (rule.calculationType === 'formula') {
    const formula = rule.formula || rule.expression || rule.description;
    if (!formula || typeof formula !== 'string' || formula.trim().length === 0) {
      throw new SalaryCalculationError(`Salary rule ${rule.code} requires a valid mathematical formula.`);
    }
  }
}

function resolveBase(rule, totals) {
  if (rule.percentageBase === 'basic') return totals.basic;
  if (rule.percentageBase === 'gross') return totals.gross;
  if (rule.percentageBase === 'net') return totals.gross - totals.deductions;
  throw new SalaryCalculationError(`Salary rule ${rule.code} has no usable percentage base.`);
}

function calculateRuleAmount(rule, totals, scope = {}) {
  if (rule.calculationType === 'fixed') {
    return roundMoney(numericValue(rule.amount ?? 0, `Amount for salary rule ${rule.code}`));
  }
  if (rule.calculationType === 'percentage') {
    const base = resolveBase(rule, totals);
    return roundMoney((base * numericValue(rule.percentage ?? 0, `Percentage for salary rule ${rule.code}`)) / 100);
  }
  if (rule.calculationType === 'formula') {
    const formulaStr = rule.formula || rule.expression || rule.description;
    if (!formulaStr) return 0;
    const formulaScope = {
      ...scope,
      BASIC: totals.basic ?? 0,
      GROSS: totals.gross ?? 0,
      DEDUCTION: totals.deductions ?? 0,
      DEDUCTIONS: totals.deductions ?? 0,
      NET: (totals.gross ?? 0) - (totals.deductions ?? 0),
    };
    return evaluateFormula(formulaStr, formulaScope);
  }
  return 0;
}

function sortRules(rules) {
  const typeOrder = { basic: 0, earning: 1, allowance: 1, gross: 2, deduction: 3, employer_contribution: 4, net: 5 };
  return [...rules].sort((left, right) =>
    (typeOrder[left.type] ?? 1) - (typeOrder[right.type] ?? 1)
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
