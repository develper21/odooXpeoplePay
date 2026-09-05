// Salary rules CRUD collection API backed by the existing salary_rules table.
// Statutory rates remain configurable data; no Indian tax formulas are hard-coded.

import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { salaryRules, salaryStructures } from '@/lib/schema';

const ruleColumns = {
  id: salaryRules.id,
  salary_structure_id: salaryRules.salaryStructureId,
  name: salaryRules.name,
  code: salaryRules.code,
  type: salaryRules.type,
  calculation_type: salaryRules.calculationType,
  amount: salaryRules.amount,
  percentage: salaryRules.percentage,
  percentage_base: salaryRules.percentageBase,
  is_taxable: salaryRules.isTaxable,
  computation_order: salaryRules.computationOrder,
  is_active: salaryRules.isActive,
  created_at: salaryRules.createdAt,
  updated_at: salaryRules.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc }) => asc(row.id),
  });
  return company?.id ?? null;
}

const amount = z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)]).transform(Number).refine((value) => value <= 999999999999.99, 'Amount is too large.').nullable().optional();
const percentage = z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)]).transform(Number).refine((value) => value >= 0 && value <= 100, 'Percentage must be between 0 and 100.').nullable().optional();
const ruleSchema = z.object({
  salary_structure_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().toUpperCase().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  type: z.enum(['earning', 'deduction', 'employer_contribution']),
  calculation_type: z.enum(['fixed', 'percentage']).default('fixed'),
  amount,
  percentage,
  percentage_base: z.enum(['gross', 'basic', 'net']).nullable().optional(),
  is_taxable: z.boolean().optional(),
  computation_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
}).superRefine((rule, context) => {
  if (rule.calculation_type === 'fixed' && rule.amount == null) context.addIssue({ code: 'custom', path: ['amount'], message: 'amount is required for fixed rules.' });
  if (rule.calculation_type === 'percentage' && (rule.percentage == null || rule.percentage_base == null)) context.addIssue({ code: 'custom', path: ['percentage'], message: 'percentage and percentage_base are required.' });
});

async function validateStructure(structureId, companyId) {
  const [structure] = await db.select({ id: salaryStructures.id, companyId: salaryStructures.companyId }).from(salaryStructures).where(eq(salaryStructures.id, structureId)).limit(1);
  if (!structure) return NextResponse.json({ error: `Salary structure ${structureId} not found.` }, { status: 422 });
  if (structure.companyId !== companyId) return NextResponse.json({ error: `Salary structure ${structureId} does not belong to the current company.` }, { status: 422 });
  return null;
}
function ruleValues(data, structureId) {
  const fixed = data.calculation_type === 'fixed';
  return {
    salaryStructureId: structureId,
    name: data.name,
    code: data.code,
    type: data.type,
    calculationType: data.calculation_type,
    amount: fixed && data.amount != null ? String(data.amount) : null,
    percentage: !fixed && data.percentage != null ? String(data.percentage) : null,
    percentageBase: fixed ? null : data.percentage_base,
    isTaxable: data.is_taxable ?? true,
    computationOrder: data.computation_order ?? 0,
    isActive: data.is_active ?? true,
  };
}

export async function GET(request) {
  const { error } = await requirePermission('salary_structures:read');
  if (error) return error;
  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ salary_rules: [] });
    const structureValue = new URL(request.url).searchParams.get('salary_structure_id');
    const filters = [eq(salaryStructures.companyId, companyId)];
    if (structureValue !== null) {
      const structureId = Number(structureValue);
      if (!Number.isInteger(structureId) || structureId <= 0) return NextResponse.json({ error: 'salary_structure_id must be a positive integer.' }, { status: 400 });
      filters.push(eq(salaryRules.salaryStructureId, structureId));
    }
    const rows = await db.select(ruleColumns).from(salaryRules).innerJoin(salaryStructures, eq(salaryRules.salaryStructureId, salaryStructures.id)).where(and(...filters)).orderBy(asc(salaryRules.salaryStructureId), asc(salaryRules.computationOrder), asc(salaryRules.id));
    return NextResponse.json({ salary_rules: rows });
  } catch (err) {
    console.error('GET /api/salary-rules failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('salary_structures:write');
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const parsed = ruleSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: 'Invalid salary rule payload.', issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });
  const companyId = await getCompanyId();
  if (companyId === null) return NextResponse.json({ error: 'Company profile must be set up before creating salary rules.' }, { status: 409 });
  const structureError = await validateStructure(parsed.data.salary_structure_id, companyId);
  if (structureError) return structureError;
  try {
    const [rule] = await db.insert(salaryRules).values(ruleValues(parsed.data, parsed.data.salary_structure_id)).returning(ruleColumns);
    return NextResponse.json({ salary_rule: rule }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) return NextResponse.json({ error: 'Salary rule code already exists for this salary structure.' }, { status: 409 });
    if (pgCode === '23503') return NextResponse.json({ error: 'Salary rule references a record that does not exist.' }, { status: 409 });
    console.error('POST /api/salary-rules failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
