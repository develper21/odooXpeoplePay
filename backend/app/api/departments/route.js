// app/api/departments/route.js
// Department collection API: list and create departments.
//
// Contract (snake_case fields, mirroring the departments table columns):
//   GET    → 200 { departments: [{ id, company_id, parent_id, manager_id,
//                               name, code, description, status,
//                               created_at, updated_at }] }
//            (scoped to the company, ordered by id)
//   POST   → 201 { department: {...} } · 400 invalid payload · 409 duplicate code
//   401 → not authenticated (middleware) · 403 → missing permission
//
// Authorization (existing permission system):
// - GET  requires 'departments:read'  — today only ADMIN passes via '*'
// - POST requires 'departments:write' — ADMIN-only in the seeded demo.
//
// Scope: every query is filtered to the company_id of the seeded company.
// Company resolution mirrors the company-master API.

import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { departments } from '@/lib/schema';

// Response/selection map: every departments column, aliased to snake_case.
const departmentColumns = {
  id: departments.id,
  company_id: departments.companyId,
  parent_id: departments.parentId,
  manager_id: departments.managerId,
  name: departments.name,
  code: departments.code,
  description: departments.description,
  status: departments.status,
  created_at: departments.createdAt,
  updated_at: departments.updatedAt,
};

// The demo database holds a single company (same approach as /api/company).
// Returns the company id or null when no company exists yet.
async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (c, { asc }) => asc(c.id),
  });
  return company?.id ?? null;
}

// --- schemas ----------------------------------------------------------------

// '' on optional nullable columns clears them to null.
const emptyToNull = (schema) =>
  z.preprocess((v) => (v === '' ? null : v), schema.nullable().optional());

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Code is required.')
    .max(50, 'Code must be 50 characters or fewer.')
    .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, digits, dash, and underscore.'),
  description: emptyToNull(z.string().trim().max(2000)),
  parent_id: z
    .number()
    .int('Parent id must be an integer.')
    .positive('Parent id must be positive.')
    .nullable()
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// --- handlers ---------------------------------------------------------------

export async function GET() {
  const { error } = await requirePermission('departments:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ departments: [] });
    }

    const rows = await db
      .select(departmentColumns)
      .from(departments)
      .where(eq(departments.companyId, companyId))
      .orderBy(asc(departments.id));

    return NextResponse.json({ departments: rows });
  } catch (err) {
    console.error('GET /api/departments failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('departments:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createDepartmentSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid department payload.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const companyId = await getCompanyId();
  if (companyId === null) {
    return NextResponse.json(
      { error: 'Company profile must be set up before creating departments.' },
      { status: 409 },
    );
  }

  // Validate parent_id belongs to the same company when provided.
  if (parsed.data.parent_id != null) {
    const parent = await db.query.departments.findFirst({
      columns: { id: true, companyId: true },
      where: (d, { eq }) => eq(d.id, parsed.data.parent_id),
    });
    if (!parent) {
      return NextResponse.json(
        { error: `Parent department ${parsed.data.parent_id} not found.` },
        { status: 422 },
      );
    }
    if (parent.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Parent department does not belong to the same company.' },
        { status: 422 },
      );
    }
  }

  try {
    const [department] = await db
      .insert(departments)
      .values({
        companyId,
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description ?? null,
        parentId: parsed.data.parent_id ?? null,
        status: parsed.data.status ?? 'active',
      })
      .returning(departmentColumns);

    return NextResponse.json({ department }, { status: 201 });
  } catch (err) {
    // (company_id, code) is UNIQUE — surface a friendly 409.
    // Neon wraps the Postgres error in err.cause, so check both locations.
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Department code "${parsed.data.code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('POST /api/departments failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
