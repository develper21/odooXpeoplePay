// app/api/schedules/route.js
// Working Schedule collection API: list and create.
//
// Contract (snake_case fields, mirroring the working_schedules table columns):
//   GET    -> 200 { schedules: [{ id, company_id, name, code, description,
//                                 work_days, start_time, end_time,
//                                 break_start_time, break_end_time, weekly_hours,
//                                 timezone, is_flexible, effective_from,
//                                 effective_to, status, created_at, updated_at }] }
//   POST   -> 201 { schedule: {...} } | 400 invalid | 409 duplicate code
//   401 -> not authenticated (middleware) | 403 -> missing permission
//
// Authorization (existing permission system):
// - GET  requires 'schedules:read'   - today only ADMIN passes via '*'
// - POST requires 'schedules:write'  - ADMIN-only in the seeded demo.
//
// Scope: every query is filtered to the company_id of the seeded company.

import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { workingSchedules } from '@/lib/schema';

const scheduleColumns = {
  id: workingSchedules.id,
  company_id: workingSchedules.companyId,
  name: workingSchedules.name,
  code: workingSchedules.code,
  description: workingSchedules.description,
  work_days: workingSchedules.workDays,
  start_time: workingSchedules.startTime,
  end_time: workingSchedules.endTime,
  break_start_time: workingSchedules.breakStartTime,
  break_end_time: workingSchedules.breakEndTime,
  weekly_hours: workingSchedules.weeklyHours,
  timezone: workingSchedules.timezone,
  is_flexible: workingSchedules.isFlexible,
  effective_from: workingSchedules.effectiveFrom,
  effective_to: workingSchedules.effectiveTo,
  status: workingSchedules.status,
  created_at: workingSchedules.createdAt,
  updated_at: workingSchedules.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (c, { asc }) => asc(c.id),
  });
  return company?.id ?? null;
}

const workDayValues = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const createScheduleSchema = z.object({
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().min(1).max(50),
  description: z.string().trim().nullable().optional(),
  work_days: z.array(z.enum(workDayValues)).default([]),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:MM or HH:MM:SS').nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:MM or HH:MM:SS').nullable().optional(),
  break_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:MM or HH:MM:SS').nullable().optional(),
  break_end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:MM or HH:MM:SS').nullable().optional(),
  weekly_hours: z.number().positive().max(168).nullable().optional(),
  timezone: z.string().trim().max(100).optional(),
  is_flexible: z.boolean().optional(),
  effective_from: z.string().date().nullable().optional(),
  effective_to: z.string().date().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET() {
  const { error } = await requirePermission('schedules:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ schedules: [] });
    }

    const rows = await db
      .select(scheduleColumns)
      .from(workingSchedules)
      .where(eq(workingSchedules.companyId, companyId))
      .orderBy(asc(workingSchedules.id));

    return NextResponse.json({ schedules: rows });
  } catch (err) {
    console.error('GET /api/schedules failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('schedules:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createScheduleSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid schedule payload.',
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
      { error: 'Company profile must be set up before creating schedules.' },
      { status: 409 },
    );
  }

  try {
    const [schedule] = await db
      .insert(workingSchedules)
      .values({
        companyId,
        name: parsed.data.name.trim(),
        code: parsed.data.code.trim().toUpperCase(),
        description: parsed.data.description?.trim() || null,
        workDays: parsed.data.work_days,
        startTime: parsed.data.start_time ?? null,
        endTime: parsed.data.end_time ?? null,
        breakStartTime: parsed.data.break_start_time ?? null,
        breakEndTime: parsed.data.break_end_time ?? null,
        weeklyHours: parsed.data.weekly_hours != null ? String(parsed.data.weekly_hours) : null,
        timezone: parsed.data.timezone?.trim() || 'UTC',
        isFlexible: parsed.data.is_flexible ?? false,
        effectiveFrom: parsed.data.effective_from ?? null,
        effectiveTo: parsed.data.effective_to ?? null,
        status: parsed.data.status ?? 'active',
      })
      .returning(scheduleColumns);

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Schedule code "${parsed.data.code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('POST /api/schedules failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
