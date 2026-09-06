// backend/app/api/time-off/allocations/route.js
// Time-off allocations collection API: list and create employee leave allocations.

import { and, asc, eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { allocations, employees, timeOffTypes } from '@/lib/schema';

const allocationColumns = {
  id: allocations.id,
  company_id: allocations.companyId,
  employee_id: allocations.employeeId,
  time_off_type_id: allocations.timeOffTypeId,
  period_year: allocations.periodYear,
  entitled_days: allocations.entitledDays,
  allocated_days: allocations.allocatedDays,
  carried_over_days: allocations.carriedOverDays,
  additional_days: allocations.additionalDays,
  used_days: allocations.usedDays,
  pending_days: allocations.pendingDays,
  remaining_days: allocations.remainingDays,
  effective_from: allocations.effectiveFrom,
  effective_to: allocations.effectiveTo,
  status: allocations.status,
  created_at: allocations.createdAt,
  updated_at: allocations.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (row, { asc: orderByAsc }) => orderByAsc(row.id),
  });
  return company?.id ?? null;
}

const positiveDays = z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)])
  .transform(Number)
  .refine((v) => v >= 0 && v <= 999999.99, 'Days must be between 0 and 999999.99.');

const createAllocationSchema = z.object({
  employee_id: z.number().int().positive(),
  time_off_type_id: z.number().int().positive(),
  period_year: z.number().int().min(2000).max(2100).default(new Date().getFullYear()),
  allocated_days: positiveDays,
  effective_from: z.string().date(),
  effective_to: z.string().date().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  status: z.enum(['active', 'expired', 'revoked']).default('active'),
});

export async function GET(request) {
  const { error } = await requirePermission('time_off:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ allocations: [] });

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get('employee_id') || searchParams.get('employeeId');
    const statusParam = searchParams.get('status');
    const typeIdParam = searchParams.get('time_off_type_id') || searchParams.get('typeId');

    const filters = [eq(allocations.companyId, companyId)];
    if (employeeIdParam) {
      const numPart = Number(String(employeeIdParam).replace(/\D/g, ''));
      if (Number.isInteger(numPart) && numPart > 0) {
        filters.push(eq(allocations.employeeId, numPart));
      }
    }
    if (statusParam) {
      filters.push(eq(allocations.status, statusParam.toLowerCase()));
    }
    if (typeIdParam) {
      const parsedTypeId = Number(typeIdParam);
      if (Number.isInteger(parsedTypeId)) filters.push(eq(allocations.timeOffTypeId, parsedTypeId));
    }

    const rows = await db
      .select({
        ...allocationColumns,
        type: timeOffTypes.name,
        employee: {
          id: employees.id,
          employee_code: employees.employeeCode,
          first_name: employees.firstName,
          last_name: employees.lastName,
          email: employees.email,
        },
        time_off_type: {
          id: timeOffTypes.id,
          name: timeOffTypes.name,
          code: timeOffTypes.code,
        },
      })
      .from(allocations)
      .innerJoin(employees, eq(allocations.employeeId, employees.id))
      .innerJoin(timeOffTypes, eq(allocations.timeOffTypeId, timeOffTypes.id))
      .where(and(...filters))
      .orderBy(desc(allocations.periodYear), asc(allocations.id));

    return NextResponse.json({ allocations: rows });
  } catch (err) {
    console.error('GET /api/time-off/allocations failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error: authError } = await requirePermission('time_off:write');
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  // Normalize camelCase input if provided
  const normalized = {
    employee_id: body.employee_id ?? (body.employeeId ? Number(body.employeeId) : undefined),
    time_off_type_id: body.time_off_type_id ?? (body.typeId ? Number(body.typeId) : undefined),
    period_year: body.period_year ?? body.periodYear ?? new Date().getFullYear(),
    allocated_days: body.allocated_days ?? body.allocatedDays ?? body.days,
    effective_from: body.effective_from ?? body.effectiveFrom ?? body.validityStart ?? new Date().toISOString().slice(0, 10),
    effective_to: body.effective_to ?? body.effectiveTo ?? body.validityEnd,
    notes: body.notes ?? body.reason,
    status: (body.status || 'active').toLowerCase(),
  };

  const parsed = createAllocationSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid allocation payload.', issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) return NextResponse.json({ error: 'No company configured.' }, { status: 422 });

    const { employee_id, time_off_type_id, period_year, allocated_days, effective_from, effective_to, status } = parsed.data;

    // Check employee
    const [emp] = await db.select({ id: employees.id, status: employees.status }).from(employees).where(and(eq(employees.id, employee_id), eq(employees.companyId, companyId))).limit(1);
    if (!emp) return NextResponse.json({ error: `Employee ${employee_id} not found.` }, { status: 422 });

    // Check type
    const [type] = await db.select({ id: timeOffTypes.id }).from(timeOffTypes).where(and(eq(timeOffTypes.id, time_off_type_id), eq(timeOffTypes.companyId, companyId))).limit(1);
    if (!type) return NextResponse.json({ error: `Time-off type ${time_off_type_id} not found.` }, { status: 422 });

    // Check duplicate
    const [existing] = await db.select({ id: allocations.id }).from(allocations).where(and(
      eq(allocations.employeeId, employee_id),
      eq(allocations.timeOffTypeId, time_off_type_id),
      eq(allocations.periodYear, period_year)
    )).limit(1);

    if (existing) {
      return NextResponse.json({ error: `An allocation for this employee, leave type, and year (${period_year}) already exists.` }, { status: 409 });
    }

    const [created] = await db.insert(allocations).values({
      companyId,
      employeeId: employee_id,
      timeOffTypeId: time_off_type_id,
      periodYear: period_year,
      entitledDays: String(allocated_days),
      allocatedDays: String(allocated_days),
      carriedOverDays: '0',
      additionalDays: '0',
      usedDays: '0',
      pendingDays: '0',
      remainingDays: String(allocated_days),
      effectiveFrom: effective_from,
      effectiveTo: effective_to || null,
      status: status === 'approved' ? 'active' : status,
    }).returning(allocationColumns);

    return NextResponse.json({ allocation: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/time-off/allocations failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
