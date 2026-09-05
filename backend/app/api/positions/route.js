// app/api/positions/route.js
// Job Position collection API: list and create positions.
//
// Contract (snake_case fields, mirroring the job_positions table columns):
//   GET    → 200 { positions: [{ id, company_id, department_id, title, code, level,
//                               employment_type, salary_min, salary_max, description,
//                               status, created_at, updated_at }] }
//            (scoped to the company, ordered by id)
//   POST   → 201 { position: {...} } · 400 invalid payload · 409 duplicate code
//            · 422 invalid department_id
//   401 → not authenticated (middleware) · 403 → missing permission
//
// Authorization (existing permission system):
// - GET  requires 'positions:read'  — today only ADMIN passes via '*'
// - POST requires 'positions:write' — ADMIN-only in the seeded demo.
//
// Scope: every query is filtered to the company_id of the seeded company.

import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { jobPositions } from '@/lib/schema';

// Response/selection map: every job_positions column, aliased to snake_case.
const positionColumns = {
  id: jobPositions.id,
  company_id: jobPositions.companyId,
  department_id: jobPositions.departmentId,
  title: jobPositions.title,
  code: jobPositions.code,
  level: jobPositions.level,
  employment_type: jobPositions.employmentType,
  salary_min: jobPositions.salaryMin,
  salary_max: jobPositions.salaryMax,
  description: jobPositions.description,
  status: jobPositions.status,
  created_at: jobPositions.createdAt,
  updated_at: jobPositions.updatedAt,
};

// Resolve the seeded company id, or null when no company exists yet.
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

// Salary: accept number or numeric string; both null/undefined allowed.
const salaryField = z
  .union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/, 'Salary must be a number with up to 2 decimal places.')])
  .transform((v) => (v === null || v === undefined ? null : String(v)))
  .nullable()
  .optional();

const createPositionSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(200),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'Code is required.')
      .max(50, 'Code must be 50 characters or fewer.')
      .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, digits, dash, and underscore.'),
    department_id: z
      .number()
      .int('Department id must be an integer.')
      .positive('Department id must be positive.')
      .nullable()
      .optional(),
    level: emptyToNull(z.string().trim().max(50)),
    employment_type: z
      .enum(['full_time', 'part_time', 'contract', 'intern', 'temporary'])
      .nullable()
      .optional(),
    salary_min: salaryField,
    salary_max: salaryField,
    description: emptyToNull(z.string().trim().max(2000)),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .refine(
    (data) =>
      data.salary_min == null ||
      data.salary_max == null ||
      Number(data.salary_min) <= Number(data.salary_max),
    { message: 'salary_min must not exceed salary_max.', path: ['salary_min'] },
  );

// --- handlers ---------------------------------------------------------------

export async function GET() {
  const { error } = await requirePermission('positions:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ positions: [] });
    }

    const rows = await db
      .select(positionColumns)
      .from(jobPositions)
      .where(eq(jobPositions.companyId, companyId))
      .orderBy(asc(jobPositions.id));

    return NextResponse.json({ positions: rows });
  } catch (err) {
    console.error('GET /api/positions failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('positions:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createPositionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid position payload.',
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
      { error: 'Company profile must be set up before creating positions.' },
      { status: 409 },
    );
  }

  // Validate department_id belongs to the same company when provided.
  if (parsed.data.department_id != null) {
    const department = await db.query.departments.findFirst({
      columns: { id: true, companyId: true },
      where: (d, { eq }) => eq(d.id, parsed.data.department_id),
    });
    if (!department) {
      return NextResponse.json(
        { error: `Department ${parsed.data.department_id} not found.` },
        { status: 422 },
      );
    }
    if (department.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Department does not belong to the same company.' },
        { status: 422 },
      );
    }
  }

  try {
    const [position] = await db
      .insert(jobPositions)
      .values({
        companyId,
        title: parsed.data.title,
        code: parsed.data.code,
        departmentId: parsed.data.department_id ?? null,
        level: parsed.data.level ?? null,
        employmentType: parsed.data.employment_type ?? null,
        salaryMin: parsed.data.salary_min ?? null,
        salaryMax: parsed.data.salary_max ?? null,
        description: parsed.data.description ?? null,
        status: parsed.data.status ?? 'active',
      })
      .returning(positionColumns);

    return NextResponse.json({ position }, { status: 201 });
  } catch (err) {
    // (company_id, code) is UNIQUE — surface a friendly 409.
    // Neon wraps the Postgres error in err.cause, so check both locations.
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Position code "${parsed.data.code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('POST /api/positions failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
