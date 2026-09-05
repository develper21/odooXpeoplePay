// app/api/contracts/route.js
// Employee Schedule Assignment collection API: list and create.
//
// The employee-to-schedule assignment is modeled through the contracts table
// (contracts.working_schedule_id -> working_schedules.id). A contract links an
// employee to a working schedule for a given effective period.
//
// Contract (snake_case fields, mirroring the contracts table columns):
//   GET    -> 200 { contracts: [{ id, employee_id, company_id, job_position_id,
//                                 working_schedule_id, salary_structure_id,
//                                 contract_type, title, reference_no, start_date,
//                                 end_date, probation_end_date, notice_period_days,
//                                 salary_amount, pay_frequency, currency, terms,
//                                 document_url, signed_on, status, created_at,
//                                 updated_at }] }
//   POST   -> 201 { contract: {...} } | 400 invalid | 409 duplicate/overlap
//   401 -> not authenticated (middleware) | 403 -> missing permission
//
// Authorization (existing permission system):
// - GET  requires 'schedules:read'   - today only ADMIN passes via '*'
// - POST requires 'schedules:write'  - ADMIN-only in the seeded demo.
//
// Scope: every query is filtered to the company_id of the seeded company.

import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
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

const createContractSchema = z.object({
  employee_id: z.number().int().positive(),
  job_position_id: z.number().int().positive().nullable().optional(),
  working_schedule_id: z.number().int().positive().nullable().optional(),
  salary_structure_id: z.number().int().positive().nullable().optional(),
  contract_type: z.enum(['permanent', 'fixed_term', 'internship', 'probation', 'contractor']),
  title: z.string().trim().max(200).nullable().optional(),
  reference_no: z.string().trim().max(100).nullable().optional(),
  start_date: z.string().date(),
  end_date: z.string().date().nullable().optional(),
  probation_end_date: z.string().date().nullable().optional(),
  notice_period_days: z.number().int().positive().nullable().optional(),
  salary_amount: z.number().positive(),
  pay_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  currency: z.string().trim().length(3).optional(),
  terms: z.string().trim().nullable().optional(),
  document_url: z.string().trim().url().max(500).nullable().optional(),
  signed_on: z.string().date().nullable().optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated', 'cancelled']).optional(),
});

export async function GET(request) {
  const { error } = await requirePermission('schedules:read');
  if (error) return error;

  try {
    const companyId = await getCompanyId();
    if (companyId === null) {
      return NextResponse.json({ contracts: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));
    const offset = (page - 1) * limit;
    const q = searchParams.get('q')?.trim();

    const filters = [eq(contracts.companyId, companyId)];
    if (q) {
      filters.push(
        or(
          ilike(contracts.referenceNo, `%${q}%`),
          ilike(contracts.title, `%${q}%`),
          ilike(contracts.contractType, `%${q}%`),
        ),
      );
    }
    const whereClause = and(...filters);

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(contracts)
      .where(whereClause);

    const rows = await db
      .select(contractColumns)
      .from(contracts)
      .where(whereClause)
      .orderBy(asc(contracts.id))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      contracts: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error('GET /api/contracts failed:', err);
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

  const parsed = createContractSchema.safeParse(body ?? {});
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

  const companyId = await getCompanyId();
  if (companyId === null) {
    return NextResponse.json(
      { error: 'Company profile must be set up before creating contracts.' },
      { status: 409 },
    );
  }

  // Validate employee exists and belongs to the same company.
  const employee = await db.query.employees.findFirst({
    columns: { id: true, companyId: true, status: true },
    where: (e, { eq }) => eq(e.id, parsed.data.employee_id),
  });
  if (!employee) {
    return NextResponse.json({ error: `Employee ${parsed.data.employee_id} not found.` }, { status: 422 });
  }
  if (employee.companyId !== companyId) {
    return NextResponse.json(
      { error: `Employee ${parsed.data.employee_id} does not belong to the same company.` },
      { status: 422 },
    );
  }
  if (parsed.data.salary_structure_id != null && employee.status !== 'active') {
    return NextResponse.json(
      { error: `Employee ${parsed.data.employee_id} must be active before salary assignment.` },
      { status: 422 },
    );
  }

  // Validate working schedule exists and belongs to the same company.
  if (parsed.data.working_schedule_id != null) {
    const schedule = await db.query.workingSchedules.findFirst({
      columns: { id: true, companyId: true },
      where: (s, { eq }) => eq(s.id, parsed.data.working_schedule_id),
    });
    if (!schedule) {
      return NextResponse.json(
        { error: `Working schedule ${parsed.data.working_schedule_id} not found.` },
        { status: 422 },
      );
    }
    if (schedule.companyId !== companyId) {
      return NextResponse.json(
        { error: `Working schedule ${parsed.data.working_schedule_id} does not belong to the same company.` },
        { status: 422 },
      );
    }
  }

  // Validate job position if provided.
  if (parsed.data.job_position_id != null) {
    const position = await db.query.jobPositions.findFirst({
      columns: { id: true, companyId: true },
      where: (p, { eq }) => eq(p.id, parsed.data.job_position_id),
    });
    if (!position) {
      return NextResponse.json(
        { error: `Job position ${parsed.data.job_position_id} not found.` },
        { status: 422 },
      );
    }
    if (position.companyId !== companyId) {
      return NextResponse.json(
        { error: `Job position ${parsed.data.job_position_id} does not belong to the same company.` },
        { status: 422 },
      );
    }
  }

  // Validate salary structure if provided.
  if (parsed.data.salary_structure_id != null) {
    const salaryStructure = await db.query.salaryStructures.findFirst({
      columns: { id: true, companyId: true, status: true },
      where: (s, { eq }) => eq(s.id, parsed.data.salary_structure_id),
    });
    if (!salaryStructure) {
      return NextResponse.json(
        { error: `Salary structure ${parsed.data.salary_structure_id} not found.` },
        { status: 422 },
      );
    }
    if (salaryStructure.companyId !== companyId) {
      return NextResponse.json(
        { error: `Salary structure ${parsed.data.salary_structure_id} does not belong to the same company.` },
        { status: 422 },
      );
    }
    if (salaryStructure.status !== 'active') {
      return NextResponse.json(
        { error: `Salary structure ${parsed.data.salary_structure_id} is not active.` },
        { status: 422 },
      );
    }
  }

  // Validate effective period: end_date must be >= start_date.
  if (parsed.data.end_date && parsed.data.end_date < parsed.data.start_date) {
    return NextResponse.json(
      { error: 'end_date must be on or after start_date.' },
      { status: 422 },
    );
  }

  // Validate probation_end_date is within the contract period.
  if (parsed.data.probation_end_date) {
    if (parsed.data.probation_end_date < parsed.data.start_date) {
      return NextResponse.json(
        { error: 'probation_end_date must be on or after start_date.' },
        { status: 422 },
      );
    }
    if (parsed.data.end_date && parsed.data.probation_end_date > parsed.data.end_date) {
      return NextResponse.json(
        { error: 'probation_end_date must be on or before end_date.' },
        { status: 422 },
      );
    }
  }

  try {
    const [contract] = await db
      .insert(contracts)
      .values({
        employeeId: parsed.data.employee_id,
        companyId,
        jobPositionId: parsed.data.job_position_id ?? null,
        workingScheduleId: parsed.data.working_schedule_id ?? null,
        salaryStructureId: parsed.data.salary_structure_id ?? null,
        contractType: parsed.data.contract_type,
        title: parsed.data.title?.trim() || null,
        referenceNo: parsed.data.reference_no?.trim() || null,
        startDate: parsed.data.start_date,
        endDate: parsed.data.end_date ?? null,
        probationEndDate: parsed.data.probation_end_date ?? null,
        noticePeriodDays: parsed.data.notice_period_days ?? null,
        salaryAmount: String(parsed.data.salary_amount),
        payFrequency: parsed.data.pay_frequency ?? 'monthly',
        currency: parsed.data.currency ?? 'USD',
        terms: parsed.data.terms?.trim() || null,
        documentUrl: parsed.data.document_url?.trim() || null,
        signedOn: parsed.data.signed_on ?? null,
        status: parsed.data.status ?? 'draft',
      })
      .returning(contractColumns);

    return NextResponse.json({ contract }, { status: 201 });
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
          { error: `Employee ${parsed.data.employee_id} already has an active contract. Only one active contract is allowed per employee.` },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'A contract with these details already exists.' }, { status: 409 });
    }
    console.error('POST /api/contracts failed:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
