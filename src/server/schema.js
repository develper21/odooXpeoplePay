// lib/schema.js
// Drizzle ORM schema for the HRMS project (PostgreSQL / Neon).
//
// Conventions:
// - camelCase properties map to snake_case columns.
// - Every table has an auto-increment `id` primary key plus created_at/updated_at.
// - Status & type fields use Postgres ENUM types declared with pgEnum().
// - Foreign keys carry explicit onDelete rules tuned to each relationship.
//
// Regenerate/apply after changing this file:
//   npm run db:generate   (writes SQL migrations into ./drizzle)
//   npm run db:push       (applies the schema directly to the Neon database)

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------

// Reusable active/inactive flag for reference tables.
export const generalStatusEnum = pgEnum('general_status', ['active', 'inactive']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);
export const maritalStatusEnum = pgEnum('marital_status', ['single', 'married', 'divorced', 'widowed', 'other']);
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract', 'intern', 'temporary']);
export const employeeStatusEnum = pgEnum('employee_status', ['active', 'probation', 'on_leave', 'suspended', 'terminated']);
export const contractTypeEnum = pgEnum('contract_type', ['permanent', 'fixed_term', 'internship', 'probation', 'contractor']);
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'active', 'expired', 'terminated', 'cancelled']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'remote']);
export const attendanceSourceEnum = pgEnum('attendance_source', ['manual', 'device', 'mobile', 'import']);
export const timeOffRequestStatusEnum = pgEnum('time_off_request_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const allocationStatusEnum = pgEnum('allocation_status', ['active', 'expired', 'revoked']);
export const payFrequencyEnum = pgEnum('pay_frequency', ['daily', 'weekly', 'biweekly', 'monthly']);
export const salaryRuleTypeEnum = pgEnum('salary_rule_type', ['earning', 'deduction', 'employer_contribution']);
export const calculationTypeEnum = pgEnum('calculation_type', ['fixed', 'percentage']);
export const calculationBaseEnum = pgEnum('calculation_base', ['gross', 'basic', 'net']);
export const payrunStatusEnum = pgEnum('payrun_status', ['draft', 'processing', 'approved', 'paid', 'cancelled']);
export const payslipStatusEnum = pgEnum('payslip_status', ['draft', 'processing', 'approved', 'paid', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['bank_transfer', 'check', 'cash', 'other']);

// Shared created_at / updated_at columns. `$onUpdate` bumps updated_at on ORM updates.
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};
// ---------------------------------------------------------------------------
// AUTH & ORGANISATION
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  // A user may be created before a role is assigned.
  roleId: integer('role_id').references(() => roles.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  // Granular permission keys, e.g. ['employees:read', 'payroll:write'].
  permissions: jsonb('permissions').$type().default([]),
  isSystem: boolean('is_system').notNull().default(false),
  ...timestamps,
});

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  // Self-reference for multi-company / parent group structures.
  parentCompanyId: integer('parent_company_id').references(() => companies.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 200 }).notNull(),
  legalName: varchar('legal_name', { length: 200 }),
  taxId: varchar('tax_id', { length: 50 }).unique(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  status: generalStatusEnum('status').notNull().default('active'),
  ...timestamps,
});

export const departments = pgTable(
  'departments',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    // Self-reference for sub-departments.
    parentId: integer('parent_id').references(() => departments.id, { onDelete: 'set null' }),
    managerId: integer('manager_id').references(() => employees.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    status: generalStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [uniqueIndex('uq_departments_company_code').on(table.companyId, table.code)],
);
// ---------------------------------------------------------------------------
// PEOPLE
// ---------------------------------------------------------------------------

export const employees = pgTable(
  'employees',
  {
    id: serial('id').primaryKey(),
    // Optional until the employee gets login credentials.
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }),
    jobPositionId: integer('job_position_id').references(() => jobPositions.id, { onDelete: 'set null' }),
    managerId: integer('manager_id').references(() => employees.id, { onDelete: 'set null' }),
    employeeCode: varchar('employee_code', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 30 }),
    gender: genderEnum('gender'),
    dateOfBirth: date('date_of_birth'),
    nationality: varchar('nationality', { length: 100 }),
    maritalStatus: maritalStatusEnum('marital_status'),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    country: varchar('country', { length: 100 }),
    hireDate: date('hire_date').notNull(),
    terminationDate: date('termination_date'),
    employmentType: employmentTypeEnum('employment_type').notNull().default('full_time'),
    status: employeeStatusEnum('status').notNull().default('active'),
    profileImageUrl: varchar('profile_image_url', { length: 500 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uq_employees_company_code').on(table.companyId, table.employeeCode),
    uniqueIndex('uq_employees_user_id').on(table.userId),
    index('idx_employees_department').on(table.departmentId),
    index('idx_employees_job_position').on(table.jobPositionId),
    index('idx_employees_manager').on(table.managerId),
  ],
);

export const jobPositions = pgTable(
  'job_positions',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    departmentId: integer('department_id').references(() => departments.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    level: varchar('level', { length: 50 }),
    employmentType: employmentTypeEnum('employment_type'),
    salaryMin: numeric('salary_min', { precision: 12, scale: 2 }),
    salaryMax: numeric('salary_max', { precision: 12, scale: 2 }),
    description: text('description'),
    status: generalStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uq_job_positions_company_code').on(table.companyId, table.code),
    index('idx_job_positions_department').on(table.departmentId),
  ],
);

export const workingSchedules = pgTable(
  'working_schedules',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    // Weekday codes, e.g. ['MON', 'TUE', 'WED', 'THU', 'FRI'].
    workDays: jsonb('work_days').$type().default([]),
    startTime: time('start_time'),
    endTime: time('end_time'),
    breakStartTime: time('break_start_time'),
    breakEndTime: time('break_end_time'),
    weeklyHours: numeric('weekly_hours', { precision: 5, scale: 2 }),
    timezone: varchar('timezone', { length: 100 }).default('UTC'),
    isFlexible: boolean('is_flexible').notNull().default(false),
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),
    status: generalStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [uniqueIndex('uq_working_schedules_company_code').on(table.companyId, table.code)],
);
// ---------------------------------------------------------------------------
// EMPLOYMENT CONTRACTS & ATTENDANCE
// ---------------------------------------------------------------------------

export const contracts = pgTable(
  'contracts',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    jobPositionId: integer('job_position_id').references(() => jobPositions.id, { onDelete: 'set null' }),
    workingScheduleId: integer('working_schedule_id').references(() => workingSchedules.id, { onDelete: 'set null' }),
    // Salary structure that governs pay while this contract is in effect.
    salaryStructureId: integer('salary_structure_id').references(() => salaryStructures.id, { onDelete: 'set null' }),
    contractType: contractTypeEnum('contract_type').notNull(),
    title: varchar('title', { length: 200 }),
    referenceNo: varchar('reference_no', { length: 100 }).unique(),
    startDate: date('start_date').notNull(),
    // NULL means open-ended / permanent (no fixed end date).
    endDate: date('end_date'),
    probationEndDate: date('probation_end_date'),
    noticePeriodDays: integer('notice_period_days'),
    salaryAmount: numeric('salary_amount', { precision: 14, scale: 2 }).notNull(),
    payFrequency: payFrequencyEnum('pay_frequency').notNull().default('monthly'),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    terms: text('terms'),
    documentUrl: varchar('document_url', { length: 500 }),
    signedOn: date('signed_on'),
    status: contractStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [
    index('idx_contracts_employee').on(table.employeeId),
    index('idx_contracts_working_schedule').on(table.workingScheduleId),
    index('idx_contracts_salary_structure').on(table.salaryStructureId),
    check('chk_contract_end_after_start', sql`${table.endDate} >= ${table.startDate}`),
    // Historical contracts are allowed (multiple rows per employee over time),
    // but at most one *active* contract per employee so payroll can always
    // resolve the contract in effect for a payrun period unambiguously.
    uniqueIndex('uq_contracts_employee_active')
      .on(table.employeeId)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const attendances = pgTable(
  'attendances',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    workingScheduleId: integer('working_schedule_id').references(() => workingSchedules.id, { onDelete: 'set null' }),
    attendanceDate: date('attendance_date').notNull(),
    clockIn: timestamp('clock_in', { withTimezone: true }),
    clockOut: timestamp('clock_out', { withTimezone: true }),
    breaksDurationMinutes: integer('breaks_duration_minutes').notNull().default(0),
    workHours: numeric('work_hours', { precision: 5, scale: 2 }),
    overtimeHours: numeric('overtime_hours', { precision: 5, scale: 2 }).notNull().default('0'),
    status: attendanceStatusEnum('status').notNull().default('present'),
    source: attendanceSourceEnum('source').notNull().default('manual'),
    notes: text('notes'),
    approvedById: integer('approved_by_id').references(() => employees.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    // One attendance row per employee per day.
    uniqueIndex('uq_attendances_employee_date').on(table.employeeId, table.attendanceDate),
    // At most one open attendance can exist for an employee, even when
    // concurrent requests arrive or the open record crosses midnight.
    uniqueIndex('uq_attendances_employee_open')
      .on(table.employeeId)
      .where(sql`${table.clockIn} IS NOT NULL AND ${table.clockOut} IS NULL`),
    index('idx_attendances_date').on(table.attendanceDate),
    index('idx_attendances_status').on(table.status),
    check(
      'chk_attendance_clockout_after_clockin',
      sql`${table.clockOut} IS NULL OR ${table.clockIn} IS NULL OR ${table.clockOut} > ${table.clockIn}`,
    ),
  ],
);
export const timeOffTypes = pgTable(
  'time_off_types',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 20 }),
    isPaid: boolean('is_paid').notNull().default(true),
    isPublicHoliday: boolean('is_public_holiday').notNull().default(false),
    approvalRequired: boolean('approval_required').notNull().default(true),
    carryOverDays: integer('carry_over_days').notNull().default(0),
    maxConsecutiveDays: integer('max_consecutive_days'),
    // Leave types that accumulate over time (e.g. monthly accrual of annual leave).
    isAccrued: boolean('is_accrued').notNull().default(false),
    accrualRate: numeric('accrual_rate', { precision: 6, scale: 2 }),
    minNoticeDays: integer('min_notice_days').notNull().default(0),
    status: generalStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [uniqueIndex('uq_time_off_types_company_code').on(table.companyId, table.code)],
);

// Leave-balance allocation per employee, per leave type, per year.
export const allocations = pgTable(
  'allocations',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    timeOffTypeId: integer('time_off_type_id')
      .notNull()
      .references(() => timeOffTypes.id, { onDelete: 'cascade' }),
    periodYear: integer('period_year').notNull(),
    entitledDays: numeric('entitled_days', { precision: 8, scale: 2 }).notNull().default('0'),
    allocatedDays: numeric('allocated_days', { precision: 8, scale: 2 }).notNull().default('0'),
    carriedOverDays: numeric('carried_over_days', { precision: 8, scale: 2 }).notNull().default('0'),
    additionalDays: numeric('additional_days', { precision: 8, scale: 2 }).notNull().default('0'),
    usedDays: numeric('used_days', { precision: 8, scale: 2 }).notNull().default('0'),
    pendingDays: numeric('pending_days', { precision: 8, scale: 2 }).notNull().default('0'),
    remainingDays: numeric('remaining_days', { precision: 8, scale: 2 }).notNull().default('0'),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    status: allocationStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uq_allocations_employee_type_year').on(table.employeeId, table.timeOffTypeId, table.periodYear),
    index('idx_allocations_employee').on(table.employeeId),
    check(
      'chk_allocations_period_valid',
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
  ],
);
// ---------------------------------------------------------------------------
// TIME OFF
// ---------------------------------------------------------------------------

export const timeOffRequests = pgTable(
  'time_off_requests',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    timeOffTypeId: integer('time_off_type_id')
      .notNull()
      .references(() => timeOffTypes.id, { onDelete: 'restrict' }),
    // Optional link to the allocation used to draw the leave from.
    allocationId: integer('allocation_id').references(() => allocations.id, { onDelete: 'set null' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    // Optional times for half-day / hourly requests.
    startTime: time('start_time'),
    endTime: time('end_time'),
    isHalfDay: boolean('is_half_day').notNull().default(false),
    daysRequested: numeric('days_requested', { precision: 8, scale: 2 }).notNull(),
    reason: text('reason'),
    status: timeOffRequestStatusEnum('status').notNull().default('pending'),
    approvedById: integer('approved_by_id').references(() => employees.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('idx_time_off_requests_employee_status').on(table.employeeId, table.status),
    index('idx_time_off_requests_type').on(table.timeOffTypeId),
    check('chk_time_off_request_end_after_start', sql`${table.endDate} >= ${table.startDate}`),
    check('chk_time_off_request_days_positive', sql`${table.daysRequested} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// PAYROLL
// ---------------------------------------------------------------------------

export const salaryStructures = pgTable(
  'salary_structures',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    payFrequency: payFrequencyEnum('pay_frequency').notNull().default('monthly'),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    effectiveFrom: date('effective_from'),
    effectiveTo: date('effective_to'),
    status: generalStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uq_salary_structures_company_code').on(table.companyId, table.code),
    check(
      'chk_salary_structures_period_valid',
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveFrom} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
  ],
);

export const salaryRules = pgTable(
  'salary_rules',
  {
    id: serial('id').primaryKey(),
    salaryStructureId: integer('salary_structure_id')
      .notNull()
      .references(() => salaryStructures.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    type: salaryRuleTypeEnum('type').notNull(),
    calculationType: calculationTypeEnum('calculation_type').notNull().default('fixed'),
    // Fixed amount (when calculationType = 'fixed') ...
    amount: numeric('amount', { precision: 14, scale: 2 }),
    // ... or rate applied against percentageBase (when 'percentage').
    percentage: numeric('percentage', { precision: 6, scale: 2 }),
    percentageBase: calculationBaseEnum('percentage_base'),
    isTaxable: boolean('is_taxable').notNull().default(true),
    // Rules are evaluated in this order (earnings first, then deductions).
    computationOrder: integer('computation_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uq_salary_rules_structure_code').on(table.salaryStructureId, table.code),
    // Fixed rules must carry an amount; percentage rules a rate and a base.
    check(
      'chk_salary_rules_calculation',
      sql`(${table.calculationType} = 'fixed' AND ${table.amount} IS NOT NULL)
        OR (${table.calculationType} = 'percentage' AND ${table.percentage} IS NOT NULL AND ${table.percentageBase} IS NOT NULL)`,
    ),
  ],
);
export const payruns = pgTable(
  'payruns',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    payPeriodStart: date('pay_period_start').notNull(),
    payPeriodEnd: date('pay_period_end').notNull(),
    paymentDate: date('payment_date').notNull(),
    payFrequency: payFrequencyEnum('pay_frequency').notNull().default('monthly'),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    grossTotal: numeric('gross_total', { precision: 16, scale: 2 }).notNull().default('0'),
    deductionTotal: numeric('deduction_total', { precision: 16, scale: 2 }).notNull().default('0'),
    employerContributionTotal: numeric('employer_contribution_total', { precision: 16, scale: 2 })
      .notNull()
      .default('0'),
    netTotal: numeric('net_total', { precision: 16, scale: 2 }).notNull().default('0'),
    employeeCount: integer('employee_count').notNull().default(0),
    status: payrunStatusEnum('status').notNull().default('draft'),
    approvedById: integer('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [
    // Only one payrun per company, frequency and period.
    uniqueIndex('uq_payruns_company_period').on(table.companyId, table.payFrequency, table.payPeriodStart, table.payPeriodEnd),
    check('chk_payrun_period_end_after_start', sql`${table.payPeriodEnd} >= ${table.payPeriodStart}`),
  ],
);

export const payslips = pgTable(
  'payslips',
  {
    id: serial('id').primaryKey(),
    payrunId: integer('payrun_id')
      .notNull()
      .references(() => payruns.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'restrict' }),
    // Contract that was in effect for the employee during this payrun's period.
    // Required by payroll to attribute the payslip to the right contractual terms.
    contractId: integer('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'restrict' }),
    salaryStructureId: integer('salary_structure_id').references(() => salaryStructures.id, { onDelete: 'set null' }),
    grossAmount: numeric('gross_amount', { precision: 16, scale: 2 }).notNull().default('0'),
    deductionAmount: numeric('deduction_amount', { precision: 16, scale: 2 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 16, scale: 2 }).notNull().default('0'),
    employerContributionAmount: numeric('employer_contribution_amount', { precision: 16, scale: 2 })
      .notNull()
      .default('0'),
    netAmount: numeric('net_amount', { precision: 16, scale: 2 }).notNull().default('0'),
    paidDays: numeric('paid_days', { precision: 6, scale: 2 }),
    unpaidDays: numeric('unpaid_days', { precision: 6, scale: 2 }),
    overtimeAmount: numeric('overtime_amount', { precision: 16, scale: 2 }).notNull().default('0'),
    paymentMethod: paymentMethodEnum('payment_method').notNull().default('bank_transfer'),
    status: payslipStatusEnum('status').notNull().default('draft'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [
    // One payslip per employee per payrun.
    uniqueIndex('uq_payslips_payrun_employee').on(table.payrunId, table.employeeId),
    index('idx_payslips_employee').on(table.employeeId),
    index('idx_payslips_contract').on(table.contractId),
    index('idx_payslips_salary_structure').on(table.salaryStructureId),
  ],
);

export const payslipLines = pgTable(
  'payslip_lines',
  {
    id: serial('id').primaryKey(),
    payslipId: integer('payslip_id')
      .notNull()
      .references(() => payslips.id, { onDelete: 'cascade' }),
    // Optional link back to the source salary rule.
    salaryRuleId: integer('salary_rule_id').references(() => salaryRules.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 150 }).notNull(),
    type: salaryRuleTypeEnum('type').notNull(),
    calculationType: calculationTypeEnum('calculation_type').notNull().default('fixed'),
    amount: numeric('amount', { precision: 16, scale: 2 }).notNull().default('0'),
    quantity: numeric('quantity', { precision: 10, scale: 2 }),
    rate: numeric('rate', { precision: 14, scale: 2 }),
    isTaxable: boolean('is_taxable').notNull().default(true),
    autoComputed: boolean('auto_computed').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [index('idx_payslip_lines_payslip').on(table.payslipId)],
);
// ---------------------------------------------------------------------------
// RELATIONS (enable db.query.* with nested `with`)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  employee: one(employees, { fields: [users.id], references: [employees.userId] }),
  approvedPayruns: many(payruns, { relationName: 'payrunApprovedBy' }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  parentCompany: one(companies, {
    fields: [companies.parentCompanyId],
    references: [companies.id],
    relationName: 'parentCompany',
  }),
  childCompanies: many(companies, { relationName: 'parentCompany' }),
  departments: many(departments),
  employees: many(employees),
  jobPositions: many(jobPositions),
  workingSchedules: many(workingSchedules),
  contracts: many(contracts),
  timeOffTypes: many(timeOffTypes),
  timeOffRequests: many(timeOffRequests),
  allocations: many(allocations),
  salaryStructures: many(salaryStructures),
  payruns: many(payruns),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  company: one(companies, { fields: [departments.companyId], references: [companies.id] }),
  parent: one(departments, {
    fields: [departments.parentId],
    references: [departments.id],
    relationName: 'parentDepartment',
  }),
  children: many(departments, { relationName: 'parentDepartment' }),
  manager: one(employees, {
    fields: [departments.managerId],
    references: [employees.id],
    relationName: 'departmentManager',
  }),
  employees: many(employees, { relationName: 'departmentEmployees' }),
  jobPositions: many(jobPositions),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  company: one(companies, { fields: [employees.companyId], references: [companies.id] }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
    relationName: 'departmentEmployees',
  }),
  jobPosition: one(jobPositions, { fields: [employees.jobPositionId], references: [jobPositions.id] }),
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: 'employeeManager',
  }),
  directReports: many(employees, { relationName: 'employeeManager' }),
  managedDepartments: many(departments, { relationName: 'departmentManager' }),
  contracts: many(contracts),
  attendances: many(attendances, { relationName: 'employeeAttendances' }),
  timeOffRequests: many(timeOffRequests, { relationName: 'employeeTimeOffRequests' }),
  allocations: many(allocations),
  payslips: many(payslips),
  approvedTimeOffRequests: many(timeOffRequests, { relationName: 'timeOffApprovedBy' }),
  approvedAttendances: many(attendances, { relationName: 'attendanceApprovedBy' }),
}));

export const jobPositionsRelations = relations(jobPositions, ({ one, many }) => ({
  company: one(companies, { fields: [jobPositions.companyId], references: [companies.id] }),
  department: one(departments, { fields: [jobPositions.departmentId], references: [departments.id] }),
  employees: many(employees),
  contracts: many(contracts),
}));

export const workingSchedulesRelations = relations(workingSchedules, ({ one, many }) => ({
  company: one(companies, { fields: [workingSchedules.companyId], references: [companies.id] }),
  contracts: many(contracts),
  attendances: many(attendances),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  employee: one(employees, { fields: [contracts.employeeId], references: [employees.id] }),
  company: one(companies, { fields: [contracts.companyId], references: [companies.id] }),
  jobPosition: one(jobPositions, { fields: [contracts.jobPositionId], references: [jobPositions.id] }),
  workingSchedule: one(workingSchedules, { fields: [contracts.workingScheduleId], references: [workingSchedules.id] }),
  salaryStructure: one(salaryStructures, { fields: [contracts.salaryStructureId], references: [salaryStructures.id] }),
  payslips: many(payslips),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  employee: one(employees, {
    fields: [attendances.employeeId],
    references: [employees.id],
    relationName: 'employeeAttendances',
  }),
  workingSchedule: one(workingSchedules, { fields: [attendances.workingScheduleId], references: [workingSchedules.id] }),
  approvedBy: one(employees, {
    fields: [attendances.approvedById],
    references: [employees.id],
    relationName: 'attendanceApprovedBy',
  }),
}));
export const timeOffTypesRelations = relations(timeOffTypes, ({ one, many }) => ({
  company: one(companies, { fields: [timeOffTypes.companyId], references: [companies.id] }),
  allocations: many(allocations),
  requests: many(timeOffRequests),
}));

export const timeOffRequestsRelations = relations(timeOffRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [timeOffRequests.employeeId],
    references: [employees.id],
    relationName: 'employeeTimeOffRequests',
  }),
  company: one(companies, { fields: [timeOffRequests.companyId], references: [companies.id] }),
  timeOffType: one(timeOffTypes, { fields: [timeOffRequests.timeOffTypeId], references: [timeOffTypes.id] }),
  allocation: one(allocations, { fields: [timeOffRequests.allocationId], references: [allocations.id] }),
  approvedBy: one(employees, {
    fields: [timeOffRequests.approvedById],
    references: [employees.id],
    relationName: 'timeOffApprovedBy',
  }),
}));

export const allocationsRelations = relations(allocations, ({ one, many }) => ({
  company: one(companies, { fields: [allocations.companyId], references: [companies.id] }),
  employee: one(employees, { fields: [allocations.employeeId], references: [employees.id] }),
  timeOffType: one(timeOffTypes, { fields: [allocations.timeOffTypeId], references: [timeOffTypes.id] }),
  timeOffRequests: many(timeOffRequests),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one, many }) => ({
  company: one(companies, { fields: [salaryStructures.companyId], references: [companies.id] }),
  rules: many(salaryRules),
  contracts: many(contracts),
  payslips: many(payslips),
}));

export const salaryRulesRelations = relations(salaryRules, ({ one, many }) => ({
  salaryStructure: one(salaryStructures, {
    fields: [salaryRules.salaryStructureId],
    references: [salaryStructures.id],
  }),
  payslipLines: many(payslipLines),
}));

export const payrunsRelations = relations(payruns, ({ one, many }) => ({
  company: one(companies, { fields: [payruns.companyId], references: [companies.id] }),
  payslips: many(payslips),
  approvedBy: one(users, {
    fields: [payruns.approvedById],
    references: [users.id],
    relationName: 'payrunApprovedBy',
  }),
}));

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  payrun: one(payruns, { fields: [payslips.payrunId], references: [payruns.id] }),
  employee: one(employees, { fields: [payslips.employeeId], references: [employees.id] }),
  contract: one(contracts, { fields: [payslips.contractId], references: [contracts.id] }),
  salaryStructure: one(salaryStructures, {
    fields: [payslips.salaryStructureId],
    references: [salaryStructures.id],
  }),
  lines: many(payslipLines),
}));

export const payslipLinesRelations = relations(payslipLines, ({ one }) => ({
  payslip: one(payslips, { fields: [payslipLines.payslipId], references: [payslips.id] }),
  salaryRule: one(salaryRules, { fields: [payslipLines.salaryRuleId], references: [salaryRules.id] }),
}));