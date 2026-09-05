// Salary structure collection API for configurable payroll rules.
// Indian statutory components remain data-driven salary_rules, not hard-coded.

import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { salaryRules, salaryStructures } from '@/lib/schema';

const salaryStructureColumns = {
  id: salaryStructures.id,
  company_id: salaryStructures.companyId,
  name: salaryStructures.name,
  code: salaryStructures.code,
  description: salaryStructures.description,
  pay_frequency: salaryStructures.payFrequency,
  currency: salaryStructures.currency,
  effective_from: salaryStructures.effectiveFrom,
  effective_to: salaryStructures.effectiveTo,
  status: salaryStructures.status,
  created_at: salaryStructures.createdAt,
  updated_at: salaryStructures.updatedAt,
};

const salaryRuleColumns = {
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
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

const emptyToNull = (schema) =>
  z.preprocess((value) => (value === '' ? null : value), schema.nullable().optional());
const amount = z
  .union([
    z.number(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a non-negative amount with up to 2 decimals.'),
  ])
  .transform(Number)
  .refine((value) => value <= 999999999999.99, 'Amount is too large.')
  .nullable()
  .optional();
const percentage = z
  .union([
    z.number(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a percentage with up to 2 decimals.'),
  ])
  .transform(Number)
  .refine((value) => value >= 0 && value <= 100, 'Percentage must be between 0 and 100.')
  .nullable()
  .optional();

const salaryRuleSchema = z
  .object({
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
  })
  .superRefine((rule, context) => {
    if (rule.calculation_type === 'fixed' && rule.amount == null) {
      context.addIssue({ code: 'custom', path: ['amount'], message: 'amount is required for fixed rules.' });
    }
    if (rule.calculation_type === 'percentage' && (rule.percentage == null || rule.percentage_base == null)) {
      context.addIssue({ code: 'custom', path: ['percentage'], message: 'percentage and percentage_base are required.' });
    }
  });

const structureFields = {
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().toUpperCase().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  description: emptyToNull(z.string().trim()),
  pay_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  effective_from: z.string().date().nullable().optional(),
  effective_to: z.string().date().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
};

const createSalaryStructureSchema = z.object({
  ...structureFields,
  rules: z.array(salaryRuleSchema).optional(),
}).refine((data) => !data.effective_from || !data.effective_to || data.effective_to >= data.effective_from, {
  message: 'effective_to must be on or after effective_from.',
  path: ['effective_to'],
});

function ruleValues(rule, salaryStructureId) {
  const isFixed = rule.calculation_type === 'fixed';
  return {
    salaryStructureId,
    name: rule.name,
    code: rule.code,
    type: rule.type,
    calculationType: rule.calculation_type,
    amount: isFixed && rule.amount != null ? String(rule.amount) : null,
    percentage: !isFixed && rule.percentage != null ? String(rule.percentage) : null,
    percentageBase: !isFixed ? rule.percentage_base : null,
    isTaxable: rule.is_taxable ?? true,
    computationOrder: rule.computation_order ?? 0,
    isActive: rule.is_active ?? true,
  };
}

async function getRules(salaryStructureId) {
  return db
    .select(salaryRuleColumns)
    .from(salaryRules)
    .where(eq(salaryRules.salaryStructureId, salaryStructureId))
    .orderBy(asc(salaryRules.computationOrder), asc(salaryRules.id));
}

async function withRules(structure) {
  return { ...structure, rules: await getRules(structure.id) };
}

export async function GET() {
  const { error } = await requirePermission('salary_structures:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ salary_structures: [] });
    const structures = await db
      .select(salaryStructureColumns)
      .from(salaryStructures)
      .where(eq(salaryStructures.companyId, companyId))
      .orderBy(asc(salaryStructures.id));
    return NextResponse.json({ salary_structures: await Promise.all(structures.map(withRules)) });
  } catch (err) {
    console.error('GET /api/salary-structures failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('salary_structures:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const parsed = createSalaryStructureSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Invalid salary structure payload.',
      issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    }, { status: 400 });
  }

  const companyId = await getCompanyId();
  if (companyId === null) return NextResponse.json({ error: 'Company profile must be set up before creating salary structures.' }, { status: 409 });

  try {
    const structure = await db.transaction(async (tx) => {
      const [created] = await tx.insert(salaryStructures).values({
        companyId,
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description ?? null,
        payFrequency: parsed.data.pay_frequency ?? 'monthly',
        currency: parsed.data.currency ?? 'USD',
        effectiveFrom: parsed.data.effective_from ?? null,
        effectiveTo: parsed.data.effective_to ?? null,
        status: parsed.data.status ?? 'active',
      }).returning(salaryStructureColumns);
      if (parsed.data.rules?.length) {
        await tx.insert(salaryRules).values(parsed.data.rules.map((rule) => ruleValues(rule, created.id)));
      }
      return created;
    });
    return NextResponse.json({ salary_structure: await withRules(structure) }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) return NextResponse.json({ error: 'Salary structure code or rule code already exists.' }, { status: 409 });
    console.error('POST /api/salary-structures failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
