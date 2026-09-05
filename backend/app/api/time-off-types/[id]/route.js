// Single time-off type API: read, update, delete one company-scoped leave type.

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { timeOffTypes } from '@/lib/schema';

const timeOffTypeColumns = {
  id: timeOffTypes.id,
  company_id: timeOffTypes.companyId,
  name: timeOffTypes.name,
  code: timeOffTypes.code,
  description: timeOffTypes.description,
  color: timeOffTypes.color,
  is_paid: timeOffTypes.isPaid,
  is_public_holiday: timeOffTypes.isPublicHoliday,
  approval_required: timeOffTypes.approvalRequired,
  carry_over_days: timeOffTypes.carryOverDays,
  max_consecutive_days: timeOffTypes.maxConsecutiveDays,
  is_accrued: timeOffTypes.isAccrued,
  accrual_rate: timeOffTypes.accrualRate,
  min_notice_days: timeOffTypes.minNoticeDays,
  status: timeOffTypes.status,
  created_at: timeOffTypes.createdAt,
  updated_at: timeOffTypes.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc }) => asc(row.id),
  });
  return company?.id ?? null;
}

function parseId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const emptyToNull = (schema) =>
  z.preprocess((value) => (value === '' ? null : value), schema.nullable().optional());
const nonNegativeInteger = z.number().int().nonnegative();
const decimal = z
  .union([
    z.number(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a non-negative number with up to 2 decimals.'),
  ])
  .transform(Number)
  .refine((value) => value <= 9999.99, 'Must be 9999.99 or less.');

const updateTimeOffTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150).optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Code is required.')
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, digits, dash, and underscore.')
    .optional(),
  description: emptyToNull(z.string().trim()),
  color: emptyToNull(z.string().trim().max(20)),
  is_paid: z.boolean().optional(),
  is_public_holiday: z.boolean().optional(),
  approval_required: z.boolean().optional(),
  carry_over_days: nonNegativeInteger.optional(),
  max_consecutive_days: nonNegativeInteger.nullable().optional(),
  is_accrued: z.boolean().optional(),
  accrual_rate: decimal.nullable().optional(),
  min_notice_days: nonNegativeInteger.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

async function findTimeOffType(id, companyId) {
  const [timeOffType] = await db
    .select(timeOffTypeColumns)
    .from(timeOffTypes)
    .where(and(eq(timeOffTypes.id, id), eq(timeOffTypes.companyId, companyId)))
    .limit(1);
  return timeOffType;
}

export async function GET(_request, { params }) {
  const { error } = await requirePermission('time_off:read');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid time-off type id.' }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Time-off type ${id} not found.` }, { status: 404 });
    const timeOffType = await findTimeOffType(id, companyId);
    if (!timeOffType) return NextResponse.json({ error: `Time-off type ${id} not found.` }, { status: 404 });
    return NextResponse.json({ time_off_type: timeOffType });
  } catch (err) {
    console.error('GET /api/time-off-types/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('time_off:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid time-off type id.' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (body === null || typeof body !== 'object' || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  }

  const parsed = updateTimeOffTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid time-off type payload.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const updates = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    const fieldMap = {
      name: 'name',
      code: 'code',
      description: 'description',
      color: 'color',
      is_paid: 'isPaid',
      is_public_holiday: 'isPublicHoliday',
      approval_required: 'approvalRequired',
      carry_over_days: 'carryOverDays',
      max_consecutive_days: 'maxConsecutiveDays',
      is_accrued: 'isAccrued',
      accrual_rate: 'accrualRate',
      min_notice_days: 'minNoticeDays',
      status: 'status',
    };
    updates[fieldMap[key]] =
      key === 'description' || key === 'color'
        ? value?.trim() || null
        : key === 'accrual_rate'
          ? value == null ? null : String(value)
          : value;
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Time-off type ${id} not found.` }, { status: 404 });

    const [timeOffType] = await db
      .update(timeOffTypes)
      .set(updates)
      .where(and(eq(timeOffTypes.id, id), eq(timeOffTypes.companyId, companyId)))
      .returning(timeOffTypeColumns);
    if (!timeOffType) return NextResponse.json({ error: `Time-off type ${id} not found.` }, { status: 404 });
    return NextResponse.json({ time_off_type: timeOffType });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json({ error: 'Time-off type code already exists for this company.' }, { status: 409 });
    }
    console.error('PATCH /api/time-off-types/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('time_off:write');
  if (error) return error;

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid time-off type id.' }, { status: 400 });

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: `Time-off type ${id} not found.` }, { status: 404 });

    const [deleted] = await db
      .delete(timeOffTypes)
      .where(and(eq(timeOffTypes.id, id), eq(timeOffTypes.companyId, companyId)))
      .returning({ id: timeOffTypes.id });
    if (!deleted) return NextResponse.json({ error: `Time-off type ${id} not found.` }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint|violates foreign key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: 'Cannot delete a time-off type that is referenced by leave records.' },
        { status: 409 },
      );
    }
    console.error('DELETE /api/time-off-types/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
