// app/api/schedules/[id]/route.js
// Single working schedule API: read, update, delete.
//
// Contract (snake_case fields):
//   GET    -> 200 { schedule: {...} } | 400 invalid id | 404 not found
//   PATCH  -> 200 { schedule: {...} } | 400 invalid | 404 | 409 dup code
//   DELETE -> 204 (no body) | 400 | 404 | 409 FK violation
//   401 -> not authenticated (middleware) | 403 -> missing permission
//
// Authorization:
// - GET   requires 'schedules:read'
// - PATCH/DELETE requires 'schedules:write'
//
// Scope: schedule must belong to the seeded company.

import { eq } from 'drizzle-orm';
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

async function findSchedule(idOrCode, companyId) {
  const numId = Number(idOrCode);
  if (Number.isInteger(numId) && numId > 0) {
    const byId = await db.query.workingSchedules.findFirst({
      where: (s, { eq, and }) => and(eq(s.id, numId), eq(s.companyId, companyId)),
    });
    if (byId) return byId;
  }
  const code = String(idOrCode).toUpperCase();
  return db.query.workingSchedules.findFirst({
    where: (s, { eq, and }) => and(eq(s.code, code), eq(s.companyId, companyId)),
  });
}

const workDayValues = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const updateScheduleSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  code: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().nullable().optional(),
  work_days: z.array(z.enum(workDayValues)).optional(),
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

export async function GET(_request, { params }) {
  const { error } = await requirePermission('schedules:read');
  if (error) return error;

  const resolvedParams = await params;
  const rawId = resolvedParams?.id;
  if (!rawId) {
    return NextResponse.json({ error: 'Invalid schedule id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: 'Schedule not found.' }, { status: 404 });
    }

    const schedule = await findSchedule(rawId, companyId);
    if (!schedule) {
      return NextResponse.json({ error: `Schedule ${rawId} not found.` }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (err) {
    console.error('GET /api/schedules/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('schedules:write');
  if (error) return error;

  const resolvedParams = await params;
  const id = Number(resolvedParams?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid schedule id.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (body === null || typeof body !== 'object' || Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'At least one field is required.' }, { status: 400 });
  }

  const parsed = updateScheduleSchema.safeParse(body);
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

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Schedule ${id} not found.` }, { status: 404 });
    }

    const existing = await findSchedule(id, companyId);
    if (!existing) {
      return NextResponse.json({ error: `Schedule ${id} not found.` }, { status: 404 });
    }

    const data = parsed.data;

    const updates = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === 'code') updates.code = value.trim().toUpperCase();
      else if (key === 'name') updates.name = value.trim();
      else if (key === 'description') updates.description = value?.trim() || null;
      else if (key === 'work_days') updates.workDays = value;
      else if (key === 'start_time') updates.startTime = value;
      else if (key === 'end_time') updates.endTime = value;
      else if (key === 'break_start_time') updates.breakStartTime = value;
      else if (key === 'break_end_time') updates.breakEndTime = value;
      else if (key === 'weekly_hours') updates.weeklyHours = value != null ? String(value) : null;
      else if (key === 'timezone') updates.timezone = value?.trim() || 'UTC';
      else if (key === 'effective_from') updates.effectiveFrom = value;
      else if (key === 'effective_to') updates.effectiveTo = value;
      else updates[key] = value;
    }

    const [schedule] = await db
      .update(workingSchedules)
      .set(updates)
      .where(eq(workingSchedules.id, id))
      .returning(scheduleColumns);

    return NextResponse.json({ schedule });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Schedule code "${parsed.data.code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('PATCH /api/schedules/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('schedules:write');
  if (error) return error;

  const resolvedParams = await params;
  const id = Number(resolvedParams?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid schedule id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Schedule ${id} not found.` }, { status: 404 });
    }

    const existing = await findSchedule(id, companyId);
    if (!existing) {
      return NextResponse.json({ error: `Schedule ${id} not found.` }, { status: 404 });
    }

    await db.delete(workingSchedules).where(eq(workingSchedules.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Schedule ${id} cannot be deleted because other records reference it.` },
        { status: 409 },
      );
    }
    console.error('DELETE /api/schedules/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
