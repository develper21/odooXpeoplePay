





















































// app/api/employees/route.js
// Employee collection API: list and create employees.
//
// Contract (snake_case fields, mirroring the employees table columns):
//   GET    -> 200 { employees: [...], pagination: { page, limit, total, totalPages } }
//   POST   -> 201 { employee: {...} } | 400 invalid | 409 duplicate code
//   401 -> not authenticated (middleware) | 403 -> missing permission
//
// Authorization (existing permission system):
// - GET  requires 'employees:read'  - today only ADMIN passes via '*'
// - POST requires 'employees:write' - ADMIN-only in the seeded demo.
//
// Scope: every query is filtered to the company_id of the seeded company.

import { asc, eq, ilike, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { departments, employees, jobPositions } from '@/lib/schema';

const employeeColumns = {
  id: employees.id,
  user_id: employees.userId,
  company_id: employees.companyId,
  department_id: employees.departmentId,
  job_position_id: employees.jobPositionId,
  manager_id: employees.managerId,
  employee_code: employees.employeeCode,
  first_name: employees.firstName,
  middle_name: employees.middleName,
  last_name: employees.lastName,
  email: employees.email,
  phone: employees.phone,
  gender: employees.gender,
  date_of_birth: employees.dateOfBirth,
  nationality: employees.nationality,
  marital_status: employees.maritalStatus,
  address: employees.address,
  city: employees.city,
  state: employees.state,
  postal_code: employees.postalCode,
  country: employees.country,
  hire_date: employees.hireDate,
  termination_date: employees.terminationDate,
  employment_type: employees.employmentType,
  status: employees.status,
  profile_image_url: employees.profileImageUrl,
  created_at: employees.createdAt,
  updated_at: employees.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (c, { asc }) => asc(c.id),
  });
  return company?.id ?? null;
}

async function validateReference(table, id, companyId, label) {
  const row = await db.query[table].findFirst({
    columns: { id: true, companyId: true },
    where: (r, { eq }) => eq(r.id, id),
  });
  if (!row) {
    return NextResponse.json({ error: `${label} ${id} not found.` }, { status: 422 });
  }
  if (row.companyId !== companyId) {
    return NextResponse.json(
      { error: `${label} ${id} does not belong to the same company.` },
      { status: 422 },
    );
  }
  return null;
}

const employeeStatuses = ['active', 'probation', 'on_leave', 'suspended', 'terminated'];

// Business rules:
// 1. hire_date cannot be after termination_date.
// 2. Active/probation/on_leave/suspended employees cannot have a termination_date.
// 3. Terminated employees must have a termination_date.
const employeeBusinessRules = z.object({
  hire_date: z.string().date(),
  termination_date: z.string().date().nullable().optional(),
  status: z.enum(employeeStatuses).optional(),
})
.refine((data) => {
  if (data.termination_date && data.hire_date > data.termination_date) {
    return false;
  }
  return true;
}, { message: 'hire_date cannot be after termination_date.', path: ['hire_date'] })
.refine((data) => {
  const activeStatuses = ['active', 'probation', 'on_leave', 'suspended'];
  if (data.termination_date && activeStatuses.includes(data.status ?? 'active')) {
    return false;
  }
  return true;
}, { message: 'Active employees cannot have a termination_date. Set status to terminated first.', path: ['termination_date'] })
.refine((data) => {
  if (data.status === 'terminated' && !data.termination_date) {
    return false;
  }
  return true;
}, { message: 'Terminated employees must have a termination_date.', path: ['termination_date'] });

const createEmployeeSchema = z.object({
  user_id: z.number().int().positive().nullable().optional(),
  department_id: z.number().int().positive().nullable().optional(),
  job_position_id: z.number().int().positive().optional(),
  manager_id: z.number().int().positive().optional(),
  employee_code: z.string().trim().min(1).max(50),
  first_name: z.string().trim().min(1).max(100),
  middle_name: z.string().trim().max(100).nullable().optional(),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().max(30).nullable().optional(),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).nullable().optional(),
  date_of_birth: z.string().date().nullable().optional(),
  nationality: z.string().trim().max(100).nullable().optional(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed']).nullable().optional(),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  hire_date: z.string().date(),
  termination_date: z.string().date().nullable().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern', 'temporary']).optional(),
  status: z.enum(employeeStatuses).optional(),
  profile_image_url: z.string().trim().url().max(500).nullable().optional(),
})
.and(employeeBusinessRules);

// ── End of schema ──

export async function GET(request) {
  const { error } = await requirePermission('employees:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ employees: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } });
    }

    // ── Pagination params ──
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const rawLimit = parseInt(searchParams.get('limit') ?? '10', 10);
    const limit = Math.min(100, Math.max(1, rawLimit || 10));
    const offset = (page - 1) * limit;

    // ── Search by employee_code, name, or email ──
    const search = searchParams.get('search')?.trim();
    const searchFilter = search
      ? or(
          ilike(employees.employeeCode, `%${search}%`),
          ilike(employees.firstName, `%${search}%`),
          ilike(employees.lastName, `%${search}%`),
          ilike(employees.email, `%${search}%`),
        )
      : null;

    const companyFilter = eq(employees.companyId, companyId);
    const where = searchFilter ? sql`${companyFilter} AND ${searchFilter}` : companyFilter;

    // ── Count + fetch ──
    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(employees)
      .where(where);

    const rows = await db
      .select(employeeColumns)
      .from(employees)
      .where(where)
      .orderBy(asc(employees.id))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      employees: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('GET /api/employees failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requirePermission('employees:write');
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = createEmployeeSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid employee payload.',
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
      { error: 'Company profile must be set up before creating employees.' },
      { status: 409 },
    );
  }

  if (parsed.data.department_id != null) {
    const err = await validateReference('departments', parsed.data.department_id, companyId, 'Department');
    if (err) return err;
  }
  if (parsed.data.job_position_id != null) {
    const err = await validateReference('jobPositions', parsed.data.job_position_id, companyId, 'Job position');
    if (err) return err;
  }
  if (parsed.data.manager_id != null) {
    const err = await validateReference('employees', parsed.data.manager_id, companyId, 'Manager');
    if (err) return err;
  }

  if (parsed.data.user_id != null) {
    const user = await db.query.users.findFirst({
      columns: { id: true },
      where: (u, { eq }) => eq(u.id, parsed.data.user_id),
    });
    if (!user) {
      return NextResponse.json({ error: `User ${parsed.data.user_id} not found.` }, { status: 422 });
    }

    const existingLink = await db.query.employees.findFirst({
      columns: { id: true, employeeCode: true },
      where: (e, { eq }) => eq(e.userId, parsed.data.user_id),
    });
    if (existingLink) {
      return NextResponse.json(
        {
          error: `User ${parsed.data.user_id} is already linked to employee ${existingLink.employeeCode} (id ${existingLink.id}). A user can only be linked to one employee record.`,
        },
        { status: 409 },
      );
    }
  }

  try {
    const [employee] = await db
      .insert(employees)
      .values({
        companyId,
        userId: parsed.data.user_id ?? null,
        departmentId: parsed.data.department_id ?? null,
        jobPositionId: parsed.data.job_position_id ?? null,
        managerId: parsed.data.manager_id ?? null,
        employeeCode: parsed.data.employee_code.trim().toUpperCase(),
        firstName: parsed.data.first_name.trim(),
        middleName: parsed.data.middle_name?.trim() || null,
        lastName: parsed.data.last_name.trim(),
        email: parsed.data.email,
        phone: parsed.data.phone?.trim() || null,
        gender: parsed.data.gender ?? null,
        dateOfBirth: parsed.data.date_of_birth ?? null,
        nationality: parsed.data.nationality?.trim() || null,
        maritalStatus: parsed.data.marital_status ?? null,
        address: parsed.data.address?.trim() || null,
        city: parsed.data.city?.trim() || null,
        state: parsed.data.state?.trim() || null,
        postalCode: parsed.data.postal_code?.trim() || null,
        country: parsed.data.country?.trim() || null,
        hireDate: parsed.data.hire_date,
        terminationDate: parsed.data.termination_date ?? null,
        employmentType: parsed.data.employment_type ?? 'full_time',
        status: parsed.data.status ?? 'active',
        profileImageUrl: parsed.data.profile_image_url?.trim() || null,
      })
      .returning(employeeColumns);

    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      const detail = err?.cause?.detail ?? err?.message ?? '';
      if (/uq_employees_user_id|user_id/i.test(detail)) {
        return NextResponse.json(
          { error: `User ${parsed.data.user_id} is already linked to another employee record.` },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: `Employee code "${parsed.data.employee_code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('POST /api/employees failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
