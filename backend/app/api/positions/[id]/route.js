// app/api/positions/[id]/route.js
// Single-position API: read, update, delete one position by id.
//
// Contract (snake_case fields, mirroring the job_positions table columns):
//   GET    → 200 { position: { id, company_id, department_id, title, code, level,
//                              employment_type, salary_min, salary_max, description,
//                              status, created_at, updated_at } }
//   PATCH  → 200 { position: {...} } (partial update; '' clears nullable cols)
//   DELETE → 204 (no body)
//   400 → invalid id / invalid payload / empty update
//   404 → position not found (or not in this company)
//   409 → duplicate code / cannot delete (employees still reference it)
//   401 → not authenticated (middleware) · 403 → missing permission
//
// Authorization (existing permission system):
// - GET    requires 'positions:read'
// - PATCH  requires 'positions:write'
// - DELETE requires 'positions:write'
//
// Scope: every operation is filtered to the company_id of the seeded company,
// so a valid id from another company still returns 404.

import { and, eq } from 'drizzle-orm';
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

// Parse and validate a route id param. Returns an int > 0 or null.
function parseId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
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

const updatePositionSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(200).optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'Code is required.')
      .max(50, 'Code must be 50 characters or fewer.')
      .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, digits, dash, and underscore.')
      .optional(),
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

export async function GET(_request, { params }) {
  const { error } = await requirePermission('positions:read');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid position id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Position ${id} not found.` }, { status: 404 });
    }

    const [position] = await db
      .select(positionColumns)
      .from(jobPositions)
      .where(and(eq(jobPositions.id, id), eq(jobPositions.companyId, companyId)))
      .limit(1);

    if (!position) {
      return NextResponse.json({ error: `Position ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({ position });
  } catch (err) {
    console.error('GET /api/positions/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('positions:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid position id.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updatePositionSchema.safeParse(body ?? {});
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

  // Keep explicitly-provided nulls (they clear columns) and drop keys that
  // were not sent, so untouched columns stay untouched.
  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Position ${id} not found.` }, { status: 404 });
    }

    // Validate department_id belongs to the same company when provided.
    if (updates.department_id != null) {
      const department = await db.query.departments.findFirst({
        columns: { id: true, companyId: true },
        where: (d, { eq }) => eq(d.id, updates.department_id),
      });
      if (!department) {
        return NextResponse.json(
          { error: `Department ${updates.department_id} not found.` },
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

    const [position] = await db
      .update(jobPositions)
      .set(updates)
      .where(and(eq(jobPositions.id, id), eq(jobPositions.companyId, companyId)))
      .returning(positionColumns);

    if (!position) {
      return NextResponse.json({ error: `Position ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({ position });
  } catch (err) {
    // (company_id, code) is UNIQUE — surface a friendly 409.
    // Neon wraps the Postgres error in err.cause, so check both locations.
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Position code "${updates.code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('PATCH /api/positions/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('positions:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid position id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Position ${id} not found.` }, { status: 404 });
    }

    const [deleted] = await db
      .delete(jobPositions)
      .where(and(eq(jobPositions.id, id), eq(jobPositions.companyId, companyId)))
      .returning({ id: jobPositions.id });

    if (!deleted) {
      return NextResponse.json({ error: `Position ${id} not found.` }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // employees.job_position_id is ON DELETE SET NULL, so deletion won't fail on
    // child employees — but guard against any other FK/restriction just in case.
    if (err?.code === '23503' || /violates foreign key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: 'Cannot delete a position that is still referenced by other records.' },
        { status: 409 },
      );
    }
    console.error('DELETE /api/positions/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
