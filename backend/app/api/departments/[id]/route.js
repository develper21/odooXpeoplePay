// app/api/departments/[id]/route.js
// Single-department API: read, update, delete one department by id.
//
// Contract (snake_case fields, mirroring the departments table columns):
//   GET    → 200 { department: { id, company_id, parent_id, manager_id,
//                               name, code, description, status,
//                               created_at, updated_at } }
//   PATCH  → 200 { department: {...} } (partial update; '' clears nullable cols)
//   DELETE → 204 (no body)
//   400 → invalid id / invalid payload / empty update
//   404 → department not found (or not in this company)
//   409 → duplicate code / cannot delete (employees still reference it)
//   401 → not authenticated (middleware) · 403 → missing permission
//
// Authorization (existing permission system):
// - GET    requires 'departments:read'
// - PATCH  requires 'departments:write'
// - DELETE requires 'departments:write'
//
// Scope: every operation is filtered to the company_id of the seeded company,
// so a valid id from another company still returns 404.

import { and, eq } from 'drizzle-orm';
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

const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150).optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Code is required.')
    .max(50, 'Code must be 50 characters or fewer.')
    .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, digits, dash, and underscore.')
    .optional(),
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

export async function GET(_request, { params }) {
  const { error } = await requirePermission('departments:read');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid department id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Department ${id} not found.` }, { status: 404 });
    }

    const [department] = await db
      .select(departmentColumns)
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .limit(1);

    if (!department) {
      return NextResponse.json({ error: `Department ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({ department });
  } catch (err) {
    console.error('GET /api/departments/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('departments:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid department id.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = updateDepartmentSchema.safeParse(body ?? {});
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
      return NextResponse.json({ error: `Department ${id} not found.` }, { status: 404 });
    }

    // Validate parent_id belongs to the same company and is not self.
    if (updates.parent_id != null) {
      if (updates.parent_id === id) {
        return NextResponse.json(
          { error: 'A department cannot be its own parent.' },
          { status: 422 },
        );
      }
      const parent = await db.query.departments.findFirst({
        columns: { id: true, companyId: true },
        where: (d, { eq }) => eq(d.id, updates.parent_id),
      });
      if (!parent) {
        return NextResponse.json(
          { error: `Parent department ${updates.parent_id} not found.` },
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

    const [department] = await db
      .update(departments)
      .set(updates)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .returning(departmentColumns);

    if (!department) {
      return NextResponse.json({ error: `Department ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({ department });
  } catch (err) {
    // (company_id, code) is UNIQUE — surface a friendly 409.
    // Neon wraps the Postgres error in err.cause, so check both locations.
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Department code "${updates.code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('PATCH /api/departments/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('departments:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid department id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Department ${id} not found.` }, { status: 404 });
    }

    const [deleted] = await db
      .delete(departments)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .returning({ id: departments.id });

    if (!deleted) {
      return NextResponse.json({ error: `Department ${id} not found.` }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // employees.department_id is ON DELETE SET NULL, so deletion won't fail on
    // child employees — but guard against any other FK/restriction just in case.
    if (err?.code === '23503' || /violates foreign key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: 'Cannot delete a department that is still referenced by other records.' },
        { status: 409 },
      );
    }
    console.error('DELETE /api/departments/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
