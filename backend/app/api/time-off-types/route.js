// Time-off type collection API: list and create company-scoped leave types.

import { asc, eq } from 'drizzle-orm';
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
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
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

const createTimeOffTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(150),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Code is required.')
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Code may only contain letters, digits, dash, and underscore.'),
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

export async function GET() {
  const { error } = await requirePermission('time_off:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ time_off_types: [] });

    const rows = await db
      .select(timeOffTypeColumns)
      .from(timeOffTypes)
      .where(eq(timeOffTypes.companyId, companyId))
      .orderBy(asc(timeOffTypes.id));

    return NextResponse.json({ time_off_types: rows });
  } catch (err) {
    console.error('GET /api/time-off-types failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('time_off:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createTimeOffTypeSchema.safeParse(body ?? {});
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

  const companyId = await getCompanyId();
  if (companyId === null) {
    return NextResponse.json(
      { error: 'Company profile must be set up before creating time-off types.' },
      { status: 409 },
    );
  }

  try {
    const [timeOffType] = await db
      .insert(timeOffTypes)
      .values({
        companyId,
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description ?? null,
        color: parsed.data.color ?? null,
        isPaid: parsed.data.is_paid ?? true,
        isPublicHoliday: parsed.data.is_public_holiday ?? false,
        approvalRequired: parsed.data.approval_required ?? true,
        carryOverDays: parsed.data.carry_over_days ?? 0,
        maxConsecutiveDays: parsed.data.max_consecutive_days ?? null,
        isAccrued: parsed.data.is_accrued ?? false,
        accrualRate: parsed.data.accrual_rate != null ? String(parsed.data.accrual_rate) : null,
        minNoticeDays: parsed.data.min_notice_days ?? 0,
        status: parsed.data.status ?? 'active',
      })
      .returning(timeOffTypeColumns);

    return NextResponse.json({ time_off_type: timeOffType }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Time-off type code "${parsed.data.code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('POST /api/time-off-types failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
