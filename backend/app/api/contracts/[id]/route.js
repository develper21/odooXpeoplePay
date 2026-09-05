// app/api/contracts/[id]/route.js
// Employee Schedule Assignment single API: read, update, delete.
//
// Contract (snake_case fields):
//   GET    -> 200 { contract: {...} } | 400 invalid id | 404 not found
//   PATCH  -> 200 { contract: {...} } | 400 invalid | 404 | 409 dup/overlap
//   DELETE -> 204 (no body) | 400 | 404
//   401 -> not authenticated (middleware) | 403 -> missing permission
//
// Authorization:
// - GET   requires 'schedules:read'
// - PATCH/DELETE requires 'schedules:write'
//
// Scope: contract must belong to the seeded company.

import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { contracts, employees, jobPositions, salaryStructures, workingSchedules } from '@/lib/schema';

const contractColumns = {
  id: contracts.id,
  employee_id: contracts.employeeId,
  company_id: contracts.companyId,
  job_position_id: contracts.jobPositionId,
  working_schedule_id: contracts.workingScheduleId,
  salary_structure_id: contracts.salaryStructureId,
  contract_type: contracts.contractType,
  title: contracts.title,
  reference_no: contracts.referenceNo,
  start_date: contracts.startDate,
  end_date: contracts.endDate,
  probation_end_date: contracts.probationEndDate,
  notice_period_days: contracts.noticePeriodDays,
  salary_amount: contracts.salaryAmount,
  pay_frequency: contracts.payFrequency,
  currency: contracts.currency,
  terms: contracts.terms,
  document_url: contracts.documentUrl,
  signed_on: contracts.signedOn,
  status: contracts.status,
  created_at: contracts.createdAt,
  updated_at: contracts.updatedAt,
};

async function getCompanyId() {
  const company = await db.query.companies.findFirst({
    columns: { id: true },
    orderBy: (c, { asc }) => asc(c.id),
  });
  return company?.id ?? null;
}

async function findContract(id, companyId) {
  return db.query.contracts.findFirst({
    where: (c, { eq, and }) => and(eq(c.id, id), eq(c.companyId, companyId)),
  });
}

const updateContractSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  job_position_id: z.number().int().positive().nullable().optional(),
  working_schedule_id: z.number().int().positive().nullable().optional(),
  salary_structure_id: z.number().int().positive().nullable().optional(),
  contract_type: z.enum(['permanent', 'fixed_term', 'internship', 'probation', 'contractor']).optional(),
  title: z.string().trim().max(200).nullable().optional(),
  reference_no: z.string().trim().max(100).nullable().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().nullable().optional(),
  probation_end_date: z.string().date().nullable().optional(),
  notice_period_days: z.number().int().positive().nullable().optional(),
  salary_amount: z.number().positive().optional(),
  pay_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  currency: z.string().trim().length(3).optional(),
  terms: z.string().trim().nullable().optional(),
  document_url: z.string().trim().url().max(500).nullable().optional(),
  signed_on: z.string().date().nullable().optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated', 'cancelled']).optional(),
});

export async function GET(_request, { params }) {
  const { error } = await requirePermission('schedules:read');
  if (error) return error;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid contract id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const contract = await findContract(id, companyId);
    if (!contract) {
      return NextResponse.json({ error: `Contract ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({ contract });
  } catch (err) {
    console.error('GET /api/contracts/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('schedules:write');
  if (error) return error;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid contract id.' }, { status: 400 });
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

  const parsed = updateContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid contract payload.',
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
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const existing = await findContract(id, companyId);
    if (!existing) {
      return NextResponse.json({ error: `Contract ${id} not found.` }, { status: 404 });
    }

    const data = parsed.data;
    const salaryAssignment = data.salary_structure_id !== undefined
      ? data.salary_structure_id !== null
      : existing.salaryStructureId !== null;
    const targetEmployeeId = data.employee_id ?? existing.employeeId;

    if (data.employee_id != null || salaryAssignment) {
      const employee = await db.query.employees.findFirst({
        columns: { id: true, companyId: true, status: true },
        where: (e, { eq }) => eq(e.id, targetEmployeeId),
      });
      if (!employee) {
        return NextResponse.json({ error: `Employee ${targetEmployeeId} not found.` }, { status: 422 });
      }
      if (employee.companyId !== companyId) {
        return NextResponse.json(
          { error: `Employee ${targetEmployeeId} does not belong to the same company.` },
          { status: 422 },
        );
      }
      if (salaryAssignment && employee.status !== 'active') {
        return NextResponse.json(
          { error: `Employee ${targetEmployeeId} must be active before salary assignment.` },
          { status: 422 },
        );
      }
    }

    if (data.working_schedule_id != null) {
      const schedule = await db.query.workingSchedules.findFirst({
        columns: { id: true, companyId: true },
        where: (s, { eq }) => eq(s.id, data.working_schedule_id),
      });
      if (!schedule) {
        return NextResponse.json(
          { error: `Working schedule ${data.working_schedule_id} not found.` },
          { status: 422 },
        );
      }
      if (schedule.companyId !== companyId) {
        return NextResponse.json(
          { error: `Working schedule ${data.working_schedule_id} does not belong to the same company.` },
          { status: 422 },
        );
      }
    }

    if (data.job_position_id != null) {
      const position = await db.query.jobPositions.findFirst({
        columns: { id: true, companyId: true },
        where: (p, { eq }) => eq(p.id, data.job_position_id),
      });
      if (!position) {
        return NextResponse.json({ error: `Job position ${data.job_position_id} not found.` }, { status: 422 });
      }
      if (position.companyId !== companyId) {
        return NextResponse.json(
          { error: `Job position ${data.job_position_id} does not belong to the same company.` },
          { status: 422 },
        );
      }
    }

    if (data.salary_structure_id != null) {
      const salaryStructure = await db.query.salaryStructures.findFirst({
        columns: { id: true, companyId: true, status: true },
        where: (s, { eq }) => eq(s.id, data.salary_structure_id),
      });
      if (!salaryStructure) {
        return NextResponse.json(
          { error: `Salary structure ${data.salary_structure_id} not found.` },
          { status: 422 },
        );
      }
      if (salaryStructure.companyId !== companyId) {
        return NextResponse.json(
          { error: `Salary structure ${data.salary_structure_id} does not belong to the same company.` },
          { status: 422 },
        );
      }
      if (salaryStructure.status !== 'active') {
        return NextResponse.json(
          { error: `Salary structure ${data.salary_structure_id} is not active.` },
          { status: 422 },
        );
      }
    }

    const startDate = data.start_date ?? existing.startDate;
    const endDate = data.end_date !== undefined ? data.end_date : existing.endDate;
    if (endDate && endDate < startDate) {
      return NextResponse.json({ error: 'end_date must be on or after start_date.' }, { status: 422 });
    }

    const probationEndDate = data.probation_end_date !== undefined ? data.probation_end_date : existing.probationEndDate;
    if (probationEndDate) {
      if (probationEndDate < startDate) {
        return NextResponse.json(
          { error: 'probation_end_date must be on or after start_date.' },
          { status: 422 },
        );
      }
      if (endDate && probationEndDate > endDate) {
        return NextResponse.json(
          { error: 'probation_end_date must be on or before end_date.' },
          { status: 422 },
        );
      }
    }

    const updates = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === 'employee_id') updates.employeeId = value;
      else if (key === 'job_position_id') updates.jobPositionId = value;
      else if (key === 'working_schedule_id') updates.workingScheduleId = value;
      else if (key === 'salary_structure_id') updates.salaryStructureId = value;
      else if (key === 'contract_type') updates.contractType = value;
      else if (key === 'title') updates.title = value?.trim() || null;
      else if (key === 'reference_no') updates.referenceNo = value?.trim() || null;
      else if (key === 'start_date') updates.startDate = value;
      else if (key === 'end_date') updates.endDate = value;
      else if (key === 'probation_end_date') updates.probationEndDate = value;
      else if (key === 'notice_period_days') updates.noticePeriodDays = value;
      else if (key === 'salary_amount') updates.salaryAmount = value != null ? String(value) : null;
      else if (key === 'pay_frequency') updates.payFrequency = value;
      else if (key === 'currency') updates.currency = value;
      else if (key === 'terms') updates.terms = value?.trim() || null;
      else if (key === 'document_url') updates.documentUrl = value?.trim() || null;
      else if (key === 'signed_on') updates.signedOn = value;
      else if (key === 'status') updates.status = value;
    }

    const [contract] = await db
      .update(contracts)
      .set(updates)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId)))
      .returning(contractColumns);

    if (!contract) {
      return NextResponse.json({ error: `Contract ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json({ contract });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    const detail = err?.cause?.detail ?? '';
    if (pgCode === '23505') {
      if (detail.includes('reference_no')) {
        return NextResponse.json(
          { error: `Reference number "${parsed.data.reference_no}" already exists.` },
          { status: 409 },
        );
      }
      if (detail.includes('active')) {
        return NextResponse.json(
          { error: `Employee ${parsed.data.employee_id ?? existing.employeeId} already has an active contract.` },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'A contract with these details already exists.' }, { status: 409 });
    }
    console.error('PATCH /api/contracts/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
export async function DELETE(_request, { params }) {
  const { error } = await requirePermission('schedules:write');
  if (error) return error;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid contract id.' }, { status: 400 });
  }

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ error: `Contract ${id} not found.` }, { status: 404 });
    }

    const existing = await findContract(id, companyId);
    if (!existing) {
      return NextResponse.json({ error: `Contract ${id} not found.` }, { status: 404 });
    }

    await db
      .delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId)));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === '23503' || /foreign key constraint/i.test(err?.message ?? '')) {
      return NextResponse.json(
        { error: `Contract ${id} cannot be deleted because other records reference it.` },
        { status: 409 },
      );
    }
    console.error('DELETE /api/contracts/:id failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}



