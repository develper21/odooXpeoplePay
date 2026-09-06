// Single salary structure API with configurable salary rules.

import { and, asc, eq, inArray } from 'drizzle-orm';
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
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
const emptyToNull = (schema) => z.preprocess((value) => (value === '' ? null : value), schema.nullable().optional());
const amount = z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)]).transform(Number).refine((value) => value <= 999999999999.99).nullable().optional();
const percentage = z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)]).transform(Number).refine((value) => value >= 0 && value <= 100).nullable().optional();
const ruleSchema = z.object({
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
const structureFields = {
  name: z.string().trim().min(1).max(150).optional(),
  code: z.string().trim().toUpperCase().min(1).max(50).regex(/^[A-Z0-9_-]+$/).optional(),
  description: emptyToNull(z.string().trim()),
  pay_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  effective_from: z.string().date().nullable().optional(),
  effective_to: z.string().date().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
};
const updateSchema = z.object({
  ...structureFields,
  rules: z.array(ruleSchema).optional(),
  rule_ids: z.array(z.union([z.number(), z.string()])).optional(),
});
function ruleValues(rule, salaryStructureId) {
  const fixed = rule.calculation_type === 'fixed';
  return {
    salaryStructureId,
    name: rule.name,
    code: rule.code,
    type: rule.type,
    calculationType: rule.calculation_type,
    amount: fixed && rule.amount != null ? String(rule.amount) : null,
    percentage: !fixed && rule.percentage != null ? String(rule.percentage) : null,
    percentageBase: fixed ? null : rule.percentage_base,
    isTaxable: rule.is_taxable ?? true,
    computationOrder: rule.computation_order ?? 0,
    isActive: rule.is_active ?? true,
  };
}
async function findStructure(id, companyId) {
  const [structure] = await db.select(salaryStructureColumns).from(salaryStructures).where(and(eq(salaryStructures.id, id), eq(salaryStructures.companyId, companyId))).limit(1);
  return structure;
}
async function withRules(structure) {
  const rules = await db.select(salaryRuleColumns).from(salaryRules).where(eq(salaryRules.salaryStructureId, structure.id)).orderBy(asc(salaryRules.computationOrder), asc(salaryRules.id));
  return { ...structure, rules };
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('salary_structures:read');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid salary structure id.' }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    const structure = companyId == null ? null : await findStructure(id, companyId);
    if (!structure) return NextResponse.json({ error: `Salary structure ${id} not found.` }, { status: 404 });
    return NextResponse.json({ salary_structure: await withRules(structure) });
  } catch (err) {
    console.error('GET /api/salary-structures/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('salary_structures:write');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid salary structure id.' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (body === null || typeof body !== 'object' || Object.keys(body).length === 0) return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid salary structure payload.', issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId == null) return NextResponse.json({ error: `Salary structure ${id} not found.` }, { status: 404 });
    const existing = await findStructure(id, companyId);
    if (!existing) return NextResponse.json({ error: `Salary structure ${id} not found.` }, { status: 404 });
    const data = parsed.data;
    const effectiveFrom = data.effective_from !== undefined ? data.effective_from : existing.effective_from;
    const effectiveTo = data.effective_to !== undefined ? data.effective_to : existing.effective_to;
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) return NextResponse.json({ error: 'effective_to must be on or after effective_from.' }, { status: 422 });
    const updates = {};
    const map = { name: 'name', code: 'code', description: 'description', pay_frequency: 'payFrequency', currency: 'currency', effective_from: 'effectiveFrom', effective_to: 'effectiveTo', status: 'status' };
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || key === 'rules') continue;
      updates[map[key]] = key === 'description' ? value?.trim() || null : value;
    }
    const structure = await db.transaction(async (tx) => {
      const [updated] = await tx.update(salaryStructures).set(updates).where(and(eq(salaryStructures.id, id), eq(salaryStructures.companyId, companyId))).returning(salaryStructureColumns);
      if (!updated) return null;
      if (data.rules !== undefined) {
        await tx.delete(salaryRules).where(eq(salaryRules.salaryStructureId, id));
        if (data.rules.length) await tx.insert(salaryRules).values(data.rules.map((rule) => ruleValues(rule, id)));
      } else if (data.rule_ids !== undefined) {
        await tx.delete(salaryRules).where(eq(salaryRules.salaryStructureId, id));
        const numericIds = data.rule_ids.map(Number).filter(n => Number.isInteger(n) && n > 0);
        if (numericIds.length > 0) {
          const fetchedRules = await tx.select().from(salaryRules).where(inArray(salaryRules.id, numericIds));
          const toInsert = fetchedRules.map(r => ({
            name: r.name,
            code: r.code,
            type: r.type,
            calculation_type: r.calculationType,
            amount: r.amount ? Number(r.amount) : null,
            percentage: r.percentage ? Number(r.percentage) : null,
            percentage_base: r.percentageBase,
            is_taxable: r.isTaxable,
            computation_order: r.computationOrder,
            is_active: r.isActive,
          }));
          if (toInsert.length > 0) {
            await tx.insert(salaryRules).values(toInsert.map((rule) => ruleValues(rule, id)));
          }
        }
      }
      return updated;
    });
    if (!structure) return NextResponse.json({ error: `Salary structure ${id} not found.` }, { status: 404 });
    return NextResponse.json({ salary_structure: await withRules(structure) });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) return NextResponse.json({ error: 'Salary structure code or rule code already exists.' }, { status: 409 });
    console.error('PATCH /api/salary-structures/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('salary_structures:write');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid salary structure id.' }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    if (companyId == null) return NextResponse.json({ error: `Salary structure ${id} not found.` }, { status: 404 });
    const [deleted] = await db.delete(salaryStructures).where(and(eq(salaryStructures.id, id), eq(salaryStructures.companyId, companyId))).returning({ id: salaryStructures.id });
    if (!deleted) return NextResponse.json({ error: `Salary structure ${id} not found.` }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint|violates foreign key/i.test(err?.message ?? '')) return NextResponse.json({ error: 'Cannot delete a salary structure referenced by other records.' }, { status: 409 });
    console.error('DELETE /api/salary-structures/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
