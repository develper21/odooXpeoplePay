// Single salary rule CRUD API backed by salary_rules.

import { and, eq } from 'drizzle-orm';
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
  const company = await db.query.companies.findFirst({ columns: { id: true }, orderBy: (row, { asc }) => asc(row.id) });
  return company?.id ?? null;
}
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
const amount = z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)]).transform(Number).refine((value) => value <= 999999999999.99).nullable().optional();
const percentage = z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)]).transform(Number).refine((value) => value >= 0 && value <= 100).nullable().optional();
const updateSchema = z.object({
  salary_structure_id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(150).optional(),
  code: z.string().trim().toUpperCase().min(1).max(50).regex(/^[A-Z0-9_-]+$/).optional(),
  type: z.enum(['earning', 'deduction', 'employer_contribution']).optional(),
  calculation_type: z.enum(['fixed', 'percentage']).optional(),
  amount,
  percentage,
  percentage_base: z.enum(['gross', 'basic', 'net']).nullable().optional(),
  is_taxable: z.boolean().optional(),
  computation_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});
async function findRule(id, companyId) {
  const [rule] = await db.select(ruleColumns).from(salaryRules).innerJoin(salaryStructures, eq(salaryRules.salaryStructureId, salaryStructures.id)).where(and(eq(salaryRules.id, id), eq(salaryStructures.companyId, companyId))).limit(1);
  return rule;
}
async function validateStructure(structureId, companyId) {
  const [structure] = await db.select({ id: salaryStructures.id, companyId: salaryStructures.companyId }).from(salaryStructures).where(eq(salaryStructures.id, structureId)).limit(1);
  if (!structure) return NextResponse.json({ error: `Salary structure ${structureId} not found.` }, { status: 422 });
  if (structure.companyId !== companyId) return NextResponse.json({ error: `Salary structure ${structureId} does not belong to the current company.` }, { status: 422 });
  return null;
}
function ruleValues(data, structureId, existing) {
  const calculationType = data.calculation_type ?? existing.calculation_type;
  const amountValue = data.amount !== undefined ? data.amount : existing.amount;
  const percentageValue = data.percentage !== undefined ? data.percentage : existing.percentage;
  const baseValue = data.percentage_base !== undefined ? data.percentage_base : existing.percentage_base;
  return {
    salaryStructureId: structureId,
    name: data.name ?? existing.name,
    code: data.code ?? existing.code,
    type: data.type ?? existing.type,
    calculationType,
    amount: calculationType === 'fixed' && amountValue != null ? String(amountValue) : null,
    percentage: calculationType === 'percentage' && percentageValue != null ? String(percentageValue) : null,
    percentageBase: calculationType === 'percentage' ? baseValue : null,
    isTaxable: data.is_taxable ?? existing.is_taxable,
    computationOrder: data.computation_order ?? existing.computation_order,
    isActive: data.is_active ?? existing.is_active,
  };
}
function configurationError(values) {
  if (values.calculationType === 'fixed' && values.amount == null) return 'amount is required for fixed rules.';
  if (values.calculationType === 'percentage' && (values.percentage == null || values.percentageBase == null)) return 'percentage and percentage_base are required.';
  return null;
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('salary_structures:read');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid salary rule id.' }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    const rule = companyId == null ? null : await findRule(id, companyId);
    if (!rule) return NextResponse.json({ error: `Salary rule ${id} not found.` }, { status: 404 });
    return NextResponse.json({ salary_rule: rule });
  } catch (err) {
    console.error('GET /api/salary-rules/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('salary_structures:write');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid salary rule id.' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  if (body === null || typeof body !== 'object' || Object.keys(body).length === 0) return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid salary rule payload.', issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    if (companyId == null) return NextResponse.json({ error: `Salary rule ${id} not found.` }, { status: 404 });
    const existing = await findRule(id, companyId);
    if (!existing) return NextResponse.json({ error: `Salary rule ${id} not found.` }, { status: 404 });
    const structureId = parsed.data.salary_structure_id ?? existing.salary_structure_id;
    const structureError = await validateStructure(structureId, companyId);
    if (structureError) return structureError;
    const values = ruleValues(parsed.data, structureId, existing);
    const errorMessage = configurationError(values);
    if (errorMessage) return NextResponse.json({ error: errorMessage }, { status: 422 });
    const [rule] = await db.update(salaryRules).set(values).where(eq(salaryRules.id, id)).returning(ruleColumns);
    if (!rule) return NextResponse.json({ error: `Salary rule ${id} not found.` }, { status: 404 });
    return NextResponse.json({ salary_rule: rule });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) return NextResponse.json({ error: 'Salary rule code already exists for this salary structure.' }, { status: 409 });
    if (pgCode === '23503') return NextResponse.json({ error: 'Salary rule references a record that does not exist.' }, { status: 409 });
    console.error('PATCH /api/salary-rules/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('salary_structures:write');
  if (error) return error;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid salary rule id.' }, { status: 400 });
  try {
    const companyId = await getCompanyId();
    if (companyId == null) return NextResponse.json({ error: `Salary rule ${id} not found.` }, { status: 404 });
    const existing = await findRule(id, companyId);
    if (!existing) return NextResponse.json({ error: `Salary rule ${id} not found.` }, { status: 404 });
    await db.delete(salaryRules).where(eq(salaryRules.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint|violates foreign key/i.test(err?.message ?? '')) return NextResponse.json({ error: 'Cannot delete a salary rule referenced by payslip records.' }, { status: 409 });
    console.error('DELETE /api/salary-rules/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
