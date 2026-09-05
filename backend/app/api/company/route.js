// app/api/company/route.js
// Company master API (singleton): read and update the company profile.
//
// Contract (snake_case fields, mirroring the companies table columns):
//   GET   → 200 { company: { id, parent_company_id, name, legal_name, tax_id,
//                            email, phone, currency, address, city, state,
//                            postal_code, country, logo_url, status,
//                            created_at, updated_at } }
//         → 404 when no company exists yet
//   PATCH → same body as GET after applying the update. Partial updates: send
//           only the fields to change; null clears an optional column.
//         → 400 empty update / invalid payload
//         → 404 when no company exists
//         → 409 when tax_id collides with the unique constraint
//   401 → not authenticated (middleware) · 403 → missing permission
//   405 → any other method
//
// Authorization (existing permission system, no new roles/keys in the seed):
// - GET  requires 'company:read'  — today only ADMIN passes via its '*'
//   wildcard; grant the key to other roles later without code changes.
// - PATCH requires 'company:write' — ADMIN-only in the seeded demo.
//
// Scope notes (hackathon minimum):
// - Reads/writes ONLY columns that exist in the companies table; the response
//   is an explicit field list, so nothing outside the schema can leak.
// - parent_company_id is returned but not PATCH-editable: multi-company
//   grouping is out of scope for the company master.
// - No database changes; no extra tables.

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { companies } from '@/lib/schema';

// Response/selection map: every companies column, aliased to snake_case.
const companyColumns = {
  id: companies.id,
  parent_company_id: companies.parentCompanyId,
  name: companies.name,
  legal_name: companies.legalName,
  tax_id: companies.taxId,
  email: companies.email,
  phone: companies.phone,
  currency: companies.currency,
  address: companies.address,
  city: companies.city,
  state: companies.state,
  postal_code: companies.postalCode,
  country: companies.country,
  logo_url: companies.logoUrl,
  status: companies.status,
  created_at: companies.createdAt,
  updated_at: companies.updatedAt,
};

// Optional nullable columns accept '' as "clear this value" — normalized to
// null before validation so PATCH { email: '' } empties the column.
const emptyToNull = (schema) =>
  z.preprocess((v) => (v === '' ? null : v), schema.nullable().optional());

// Partial update schema: every field optional, lengths mirror the columns.
const companyUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(200).optional(),
    legal_name: emptyToNull(z.string().trim().max(200)),
    tax_id: emptyToNull(z.string().trim().max(50)),
    email: emptyToNull(
      z.string().trim().toLowerCase().max(255).pipe(z.email('A valid email address is required.')),
    ),
    phone: emptyToNull(z.string().trim().max(30)),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, 'Currency must be a 3-letter code (e.g. USD).')
      .optional(),
    // Application-level cap; the column itself is unbounded text.
    address: emptyToNull(z.string().trim().max(2000)),
    city: emptyToNull(z.string().trim().max(100)),
    state: emptyToNull(z.string().trim().max(100)),
    postal_code: emptyToNull(z.string().trim().max(20)),
    country: emptyToNull(z.string().trim().max(100)),
    logo_url: emptyToNull(z.string().trim().max(500)),
    // Values of the general_status enum in the database.
    status: z.enum(['active', 'inactive']).optional(),
  });

// The demo database holds a single company (singleton master). Resolve its
// id once per request; 404 when the master record has not been set up yet.
async function getCompanyId() {
  const [row] = await db
    .select({ id: companies.id })
    .from(companies)
    .orderBy(companies.id)
    .limit(1);
  return row?.id ?? null;
}

export async function GET() {
  const { error } = await requirePermission('company:read');
  if (error) return error;

  try {
    const [company] = await db
      .select(companyColumns)
      .from(companies)
      .orderBy(companies.id)
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company profile has not been set up yet.' }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (err) {
    console.error('GET /api/company failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { error } = await requirePermission('company:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = companyUpdateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid company payload.',
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
      return NextResponse.json({ error: 'Company profile has not been set up yet.' }, { status: 404 });
    }

    // $onUpdate() stamps updated_at automatically.
    const [company] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, companyId))
      .returning(companyColumns);

    if (!company) {
      return NextResponse.json({ error: 'Company profile has not been set up yet.' }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (err) {
    // tax_id is UNIQUE (companies_tax_id_unique) — surface a friendly 409.
    // Neon wraps the Postgres error in err.cause, so check both locations.
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json({ error: 'tax_id is already in use by another company.' }, { status: 409 });
    }
    console.error('PATCH /api/company failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}