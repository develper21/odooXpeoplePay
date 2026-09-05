// app/api/employees/[id]/route.js
// Single employee API: read, update, delete.
//
// Contract (snake_case fields):
//   GET    -> 200 { employee: {...} } | 400 invalid id | 404 not found
//   PATCH  -> 200 { employee: {...} } | 400 invalid | 404 | 409 dup code
//   DELETE -> 204 (no body) | 400 | 404 | 409 FK violation
//   401 -> not authenticated (middleware) | 403 -> missing permission
//
// Authorization:
// - GET   requires 'employees:read'
// - PATCH/DELETE requires 'employees:write'
//
// Scope: employee must belong to the seeded company.

import { and, eq, ne } from 'drizzle-orm';
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

async function findEmployee(id, companyId) {
  return db.query.employees.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, id), eq(e.companyId, companyId)),
  });
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

const employeeBusinessRules = z.object({
  hire_date: z.string().date().optional(),
  termination_date: z.string().date().nullable().optional(),
  status: z.enum(employeeStatuses).optional(),
})
.refine((data) => {
  if (data.termination_date && data.hire_date && data.hire_date > data.termination_date) {
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

const updateEmployeeSchema = z.object({
  user_id: z.number().int().positive().nullable().optional(),
  department_id: z.number().int().positive().nullable().optional(),
  job_position_id: z.number().int().positive().optional(),
  manager_id: z.number().int().positive().optional(),
  employee_code: z.string().trim().min(1).max(50).optional(),
  first_name: z.string().trim().min(1).max(100).optional(),
  middle_name: z.string().trim().max(100).nullable().optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(255).optional(),
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
  hire_date: z.string().date().optional(),
  termination_date: z.string().date().nullable().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern', 'temporary']).optional(),
  status: z.enum(employeeStatuses).optional(),
  profile_image_url: z.string().trim().url().max(500).nullable().optional(),
})
.and(employeeBusinessRules);

export async function GET(_request, { params }) {
  const { error } = await requirePermission('employees:read');
  if (error) return error;

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid employee id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const employee = await findEmployee(id, companyId);
    if (!employee) {
      return NextResponse.json({ error: `Employee ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (err) {
    console.error('GET /api/employees/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}


export async function PATCH(request, { params }) {
  const { error } = await requirePermission('employees:write');
  if (error) return error;

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid employee id.' }, { status: 400 });
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

  const parsed = updateEmployeeSchema.safeParse(body);
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

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Employee ${id} not found.` }, { status: 404 });
    }

    const existing = await findEmployee(id, companyId);
    if (!existing) {
      return NextResponse.json({ error: `Employee ${id} not found.` }, { status: 404 });
    }

    const data = parsed.data;

    if (data.department_id != null) {
      const err = await validateReference('departments', data.department_id, companyId, 'Department');
      if (err) return err;
    }
    if (data.job_position_id != null) {
      const err = await validateReference('jobPositions', data.job_position_id, companyId, 'Job position');
      if (err) return err;
    }
    if (data.manager_id != null) {
      if (data.manager_id === id) {
        return NextResponse.json({ error: 'Employee cannot be their own manager.' }, { status: 422 });
      }
      const err = await validateReference('employees', data.manager_id, companyId, 'Manager');
      if (err) return err;
    }

    if (data.user_id != null) {
      const user = await db.query.users.findFirst({
        columns: { id: true },
        where: (u, { eq }) => eq(u.id, data.user_id),
      });
      if (!user) {
        return NextResponse.json({ error: `User ${data.user_id} not found.` }, { status: 422 });
      }

      const existingLink = await db.query.employees.findFirst({
        columns: { id: true, employeeCode: true },
        where: (e, { and, eq, ne }) => and(eq(e.userId, data.user_id), ne(e.id, id)),
      });
      if (existingLink) {
        return NextResponse.json(
          {
            error: `User ${data.user_id} is already linked to employee ${existingLink.employeeCode} (id ${existingLink.id}). A user can only be linked to one employee record.`,
          },
          { status: 409 },
        );
      }
    }

    const updates = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === 'employee_code') updates.employeeCode = value.trim().toUpperCase();
      else if (key === 'first_name') updates.firstName = value.trim();
      else if (key === 'middle_name') updates.middleName = value?.trim() || null;
      else if (key === 'last_name') updates.lastName = value.trim();
      else if (key === 'email') updates.email = value;
      else if (key === 'phone') updates.phone = value?.trim() || null;
      else if (key === 'date_of_birth') updates.dateOfBirth = value;
      else if (key === 'nationality') updates.nationality = value?.trim() || null;
      else if (key === 'address') updates.address = value?.trim() || null;
      else if (key === 'city') updates.city = value?.trim() || null;
      else if (key === 'state') updates.state = value?.trim() || null;
      else if (key === 'postal_code') updates.postalCode = value?.trim() || null;
      else if (key === 'country') updates.country = value?.trim() || null;
      else if (key === 'hire_date') updates.hireDate = value;
      else if (key === 'termination_date') updates.terminationDate = value;
      else if (key === 'profile_image_url') updates.profileImageUrl = value?.trim() || null;
      else updates[key] = value;
    }

    const [employee] = await db
      .update(employees)
      .set(updates)
      .where(eq(employees.id, id))
      .returning(employeeColumns);

    return NextResponse.json({ employee });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23505' || /duplicate key/i.test(err?.message ?? '')) {
      const detail = err?.cause?.detail ?? err?.message ?? '';
      if (/uq_employees_user_id|user_id/i.test(detail)) {
        return NextResponse.json(
          { error: `User ${data.user_id} is already linked to another employee record.` },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: `Employee code "${data.employee_code}" already exists for this company.` },
        { status: 409 },
      );
    }
    console.error('PATCH /api/employees/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('employees:write');
  if (error) return error;

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid employee id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Employee ${id} not found.` }, { status: 404 });
    }

    const existing = await findEmployee(id, companyId);
    if (!existing) {
      return NextResponse.json({ error: `Employee ${id} not found.` }, { status: 404 });
    }

    await db.delete(employees).where(eq(employees.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Employee ${id} cannot be deleted because other records reference it.` },
        { status: 409 },
      );
    }
    console.error('DELETE /api/employees/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
