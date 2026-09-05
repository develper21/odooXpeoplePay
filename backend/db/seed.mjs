// db/seed.mjs
// Seeds realistic HRMS demo data through Drizzle ORM (PostgreSQL / Neon).
//
// Idempotent: truncates every HRMS table (RESTART IDENTITY CASCADE — the
// drizzle migration journal in the `drizzle` schema is untouched), then
// re-inserts a coherent demo dataset with valid foreign keys.
//
// Run from backend/:   npm run db:seed
//
// NOTE: seeded user accounts share the demo password "Password123!", stored
// as a bcrypt hash (cost 12) — the same scheme lib/auth.js verifies against
// in POST /api/auth/login.

import { loadEnvFile } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';

import * as s from '../lib/schema.js';
import bcrypt from 'bcryptjs';

// --- environment ------------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '../.env.local');
if (fs.existsSync(envPath)) loadEnvFile(envPath);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (expected in backend/.env.local).');
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL), schema: s });

// --- date helpers (UTC; "today" = the day the seed runs) --------------------
const TODAY = new Date();
TODAY.setUTCHours(0, 0, 0, 0);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const isWeekday = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;
const YEAR = TODAY.getUTCFullYear();

// The `n` most recent weekdays strictly before today, newest first.
function pastWeekdays(n) {
  const out = [];
  let d = addDays(TODAY, -1);
  while (out.length < n) {
    if (isWeekday(d)) out.push(iso(d));
    d = addDays(d, -1);
  }
  return out;
}

// First weekday on/after today+offsetDays, then (count-1) further weekdays.
function futureRange(offsetDays, count) {
  let start = addDays(TODAY, offsetDays);
  while (!isWeekday(start)) start = addDays(start, 1);
  let end = start;
  let left = count - 1;
  while (left > 0) {
    end = addDays(end, 1);
    if (isWeekday(end)) left -= 1;
  }
  return [iso(start), iso(end)];
}

// UTC timestamp at Central-Time hh:mm on dateIso (CDT = UTC-5, demo only).
const at = (dateIso, hh, mm) =>
  new Date(`${dateIso}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`);

// Demo accounts share the password "Password123!", stored as a proper bcrypt
// hash (cost 12) matching lib/auth.js hashPassword() — never plaintext or
// SHA-256. The six demo rows intentionally share one hash for seed brevity;
// every real hash produced by hashPassword() salts independently.
const PASSWORD_HASH = await bcrypt.hash('Password123!', 12);

console.log('Seeding HRMS demo data…');
console.log('Resetting demo tables (TRUNCATE … RESTART IDENTITY CASCADE)…');
await db.execute(sql`TRUNCATE TABLE payslip_lines, payslips, payruns, salary_rules,
  salary_structures, contracts, attendances, time_off_requests, allocations,
  time_off_types, employees, job_positions, working_schedules, departments,
  companies, users, roles RESTART IDENTITY CASCADE`);

// --- roles -------------------------------------------------------------------
const roleRows = await db.insert(s.roles).values([
  { name: 'Administrator', code: 'ADMIN', isSystem: true, permissions: ['*'],
    description: 'Full access to every HRMS module.' },
  { name: 'HR Manager', code: 'HR_MANAGER', isSystem: true,
    permissions: ['employees:*', 'attendance:*', 'time_off:approve', 'reports:read'],
    description: 'Manages people operations and approves leave.' },
  { name: 'HR Specialist', code: 'HR', isSystem: true,
    permissions: ['employees:read', 'employees:write', 'attendance:read', 'time_off:write'],
    description: 'Day-to-day HR administration.' },
  { name: 'Payroll Officer', code: 'PAYROLL', isSystem: true,
    permissions: ['payroll:*', 'salary_structures:read', 'reports:read'],
    description: 'Runs payruns and manages salary structures.' },
  { name: 'Employee', code: 'EMPLOYEE', isSystem: true,
    permissions: ['profile:read', 'attendance:read', 'time_off:create'],
    description: 'Self-service access only.' },
]).returning();
const roleId = Object.fromEntries(roleRows.map((r) => [r.code, r.id]));
console.log(`roles: ${roleRows.length}`);

// --- company -----------------------------------------------------------------
const [company] = await db.insert(s.companies).values({
  name: 'Acme Corp (Demo)',
  legalName: 'Acme Demo Industries LLC',
  taxId: 'US-DEMO-0001',
  email: 'hello@acmedemo.com',
  phone: '+1 512 555 0100',
  currency: 'USD',
  address: '500 Congress Ave, Suite 400',
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'United States',
  status: 'active',
}).returning();
const companyId = company.id;
console.log('company: 1 (Acme Corp Demo)');

// --- users (login accounts; some linked to employees later) -------------------
const userRows = await db.insert(s.users).values([
  { roleId: roleId.ADMIN, email: 'admin@acmedemo.com', passwordHash: PASSWORD_HASH,
    firstName: 'System', lastName: 'Administrator', phone: '+1 512 555 0101', isActive: true },
  { roleId: roleId.HR_MANAGER, email: 'sarah.mitchell@acmedemo.com', passwordHash: PASSWORD_HASH,
    firstName: 'Sarah', lastName: 'Mitchell', phone: '+1 512 555 0102', isActive: true },
  { roleId: roleId.HR, email: 'david.lee@acmedemo.com', passwordHash: PASSWORD_HASH,
    firstName: 'David', lastName: 'Lee', phone: '+1 512 555 0103', isActive: true },
  { roleId: roleId.PAYROLL, email: 'maria.gomez@acmedemo.com', passwordHash: PASSWORD_HASH,
    firstName: 'Maria', lastName: 'Gomez', phone: '+1 512 555 0104', isActive: true },
  { roleId: roleId.EMPLOYEE, email: 'james.carter@acmedemo.com', passwordHash: PASSWORD_HASH,
    firstName: 'James', lastName: 'Carter', phone: '+1 512 555 0105', isActive: true },
  { roleId: roleId.EMPLOYEE, email: 'priya.patel@acmedemo.com', passwordHash: PASSWORD_HASH,
    firstName: 'Priya', lastName: 'Patel', phone: '+1 512 555 0106', isActive: true },
]).returning();
const uid = Object.fromEntries(userRows.map((u) => [u.email.split('@')[0], u.id]));
console.log(`users: ${userRows.length}`);

// --- departments (managers linked after employees exist) ----------------------
const deptRows = await db.insert(s.departments).values([
  { companyId, code: 'ENG', name: 'Engineering', description: 'Product engineering & QA' },
  { companyId, code: 'HR', name: 'Human Resources', description: 'People operations' },
  { companyId, code: 'FIN', name: 'Finance & Payroll', description: 'Accounting, payroll & benefits' },
  { companyId, code: 'SAL', name: 'Sales & Marketing', description: 'Revenue team' },
]).returning();
const deptId = Object.fromEntries(deptRows.map((d) => [d.code, d.id]));
console.log(`departments: ${deptRows.length}`);

// --- job positions ------------------------------------------------------------
const posRows = await db.insert(s.jobPositions).values([
  { companyId, departmentId: deptId.ENG, title: 'Senior Software Engineer', code: 'SR_SWE', level: 'Senior', employmentType: 'full_time', salaryMin: '95000.00', salaryMax: '130000.00' },
  { companyId, departmentId: deptId.ENG, title: 'Software Engineer', code: 'SWE', level: 'Mid', employmentType: 'full_time', salaryMin: '70000.00', salaryMax: '95000.00' },
  { companyId, departmentId: deptId.ENG, title: 'QA Engineer', code: 'QA_ENG', level: 'Mid', employmentType: 'full_time', salaryMin: '65000.00', salaryMax: '85000.00' },
  { companyId, departmentId: deptId.HR, title: 'HR Manager', code: 'HR_MGR', level: 'Manager', employmentType: 'full_time', salaryMin: '85000.00', salaryMax: '110000.00' },
  { companyId, departmentId: deptId.HR, title: 'HR Specialist', code: 'HR_SPEC', level: 'Associate', employmentType: 'full_time', salaryMin: '50000.00', salaryMax: '68000.00' },
  { companyId, departmentId: deptId.FIN, title: 'Payroll Officer', code: 'PAY_OFF', level: 'Specialist', employmentType: 'full_time', salaryMin: '65000.00', salaryMax: '90000.00' },
  { companyId, departmentId: deptId.FIN, title: 'Financial Analyst', code: 'FIN_ANL', level: 'Associate', employmentType: 'full_time', salaryMin: '60000.00', salaryMax: '80000.00' },
  { companyId, departmentId: deptId.SAL, title: 'Sales Representative', code: 'SAL_REP', level: 'Associate', employmentType: 'full_time', salaryMin: '45000.00', salaryMax: '70000.00' },
]).returning();
const posId = Object.fromEntries(posRows.map((p) => [p.code, p.id]));
console.log(`job_positions: ${posRows.length}`);

// --- working schedules ----------------------------------------------------------
const schedRows = await db.insert(s.workingSchedules).values([
  { companyId, name: 'Standard Day Shift', code: 'STD40', description: 'Mon–Fri office hours with 1h lunch',
    workDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'], startTime: '09:00:00', endTime: '17:30:00',
    breakStartTime: '12:00:00', breakEndTime: '13:00:00', weeklyHours: '37.50',
    timezone: 'America/Chicago', isFlexible: false, effectiveFrom: '2022-01-01', status: 'active' },
  { companyId, name: 'Flexible Engineering Hours', code: 'FLEX40', description: 'Mon–Fri flexible schedule, 45min lunch',
    workDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'], startTime: '09:00:00', endTime: '17:45:00',
    breakStartTime: '12:00:00', breakEndTime: '12:45:00', weeklyHours: '40.00',
    timezone: 'America/Chicago', isFlexible: true, effectiveFrom: '2022-01-01', status: 'active' },
]).returning();
const schedId = Object.fromEntries(schedRows.map((w) => [w.code, w.id]));
console.log(`working_schedules: ${schedRows.length}`);

// --- salary structure + rules ---------------------------------------------------
const [structure] = await db.insert(s.salaryStructures).values({
  companyId, name: 'Standard Monthly Structure', code: 'STD_MONTHLY',
  description: 'Default monthly pay structure with allowances, tax and contributions.',
  payFrequency: 'monthly', currency: 'USD', effectiveFrom: '2024-01-01', status: 'active',
}).returning();
const structureId = structure.id;

await db.insert(s.salaryRules).values([
  { salaryStructureId: structureId, name: 'Basic Salary', code: 'BASIC', type: 'earning',
    calculationType: 'fixed', amount: '5000.00', isTaxable: true, computationOrder: 10,
    description: 'Baseline monthly basic pay; contract salary is the source of truth.' },
  { salaryStructureId: structureId, name: 'Housing Allowance', code: 'HOUS_ALLOW', type: 'earning',
    calculationType: 'percentage', percentage: '25.00', percentageBase: 'basic', isTaxable: true, computationOrder: 20 },
  { salaryStructureId: structureId, name: 'Transport Allowance', code: 'TRANS_ALLOW', type: 'earning',
    calculationType: 'fixed', amount: '150.00', isTaxable: true, computationOrder: 30 },
  { salaryStructureId: structureId, name: 'Income Tax', code: 'INCOME_TAX', type: 'deduction',
    calculationType: 'percentage', percentage: '12.00', percentageBase: 'gross', isTaxable: false, computationOrder: 100 },
  { salaryStructureId: structureId, name: 'Social Security', code: 'SOC_SEC', type: 'deduction',
    calculationType: 'percentage', percentage: '6.00', percentageBase: 'gross', isTaxable: false, computationOrder: 110 },
  { salaryStructureId: structureId, name: 'Pension (Employer)', code: 'PENSION_ER', type: 'employer_contribution',
    calculationType: 'percentage', percentage: '8.00', percentageBase: 'gross', isTaxable: false, computationOrder: 120 },
]);
console.log('salary_structures: 1 | salary_rules: 6');

// --- employees: pass 1 = department heads (managers) --------------------------
// Circular FKs (departments.manager_id <-> employees.department_id) and the
// employees.manager_id self-reference are resolved by inserting managers
// first, then reports, then updating department managers.
const mgrRows = await db.insert(s.employees).values([
  { companyId, userId: uid['sarah.mitchell'], departmentId: deptId.HR, jobPositionId: posId.HR_MGR,
    employeeCode: 'EMP-001', firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah.mitchell@acmedemo.com',
    phone: '+1 512 555 0111', gender: 'female', dateOfBirth: '1985-11-08', nationality: 'American',
    maritalStatus: 'married', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2022-03-15', employmentType: 'full_time', status: 'active' },
  { companyId, departmentId: deptId.ENG, jobPositionId: posId.SR_SWE,
    employeeCode: 'EMP-002', firstName: 'Robert', lastName: 'Chen', email: 'robert.chen@acmedemo.com',
    phone: '+1 512 555 0112', gender: 'male', dateOfBirth: '1983-02-19', nationality: 'American',
    maritalStatus: 'married', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2022-05-02', employmentType: 'full_time', status: 'active' },
  { companyId, userId: uid['maria.gomez'], departmentId: deptId.FIN, jobPositionId: posId.PAY_OFF,
    employeeCode: 'EMP-003', firstName: 'Maria', lastName: 'Gomez', email: 'maria.gomez@acmedemo.com',
    phone: '+1 512 555 0113', gender: 'female', dateOfBirth: '1990-06-30', nationality: 'Mexican',
    maritalStatus: 'single', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2023-01-10', employmentType: 'full_time', status: 'active' },
  { companyId, departmentId: deptId.SAL, jobPositionId: posId.SAL_REP,
    employeeCode: 'EMP-004', firstName: 'Michael', lastName: 'Torres', email: 'michael.torres@acmedemo.com',
    phone: '+1 512 555 0114', gender: 'male', dateOfBirth: '1987-09-12', nationality: 'American',
    maritalStatus: 'divorced', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2022-08-22', employmentType: 'full_time', status: 'active' },
]).returning();
const E = Object.fromEntries(mgrRows.map((e) => [e.employeeCode, e]));

// --- employees: pass 2 = reports (managerId now resolvable) -------------------
const repRows = await db.insert(s.employees).values([
  { companyId, userId: uid['james.carter'], departmentId: deptId.ENG, jobPositionId: posId.SWE,
    managerId: E['EMP-002'].id, employeeCode: 'EMP-005', firstName: 'James', lastName: 'Carter',
    email: 'james.carter@acmedemo.com', phone: '+1 512 555 0115', gender: 'male', dateOfBirth: '1992-01-25',
    nationality: 'American', maritalStatus: 'single', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2023-06-12', employmentType: 'full_time', status: 'active' },
  { companyId, userId: uid['priya.patel'], departmentId: deptId.ENG, jobPositionId: posId.QA_ENG,
    managerId: E['EMP-002'].id, employeeCode: 'EMP-006', firstName: 'Priya', lastName: 'Patel',
    email: 'priya.patel@acmedemo.com', phone: '+1 512 555 0116', gender: 'female', dateOfBirth: '1994-03-17',
    nationality: 'Indian', maritalStatus: 'single', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2023-09-04', employmentType: 'full_time', status: 'active' },
  { companyId, userId: uid['david.lee'], departmentId: deptId.HR, jobPositionId: posId.HR_SPEC,
    managerId: E['EMP-001'].id, employeeCode: 'EMP-007', firstName: 'David', lastName: 'Lee',
    email: 'david.lee@acmedemo.com', phone: '+1 512 555 0117', gender: 'male', dateOfBirth: '1991-07-09',
    nationality: 'American', maritalStatus: 'married', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2024-02-19', employmentType: 'full_time', status: 'active' },
  { companyId, departmentId: deptId.FIN, jobPositionId: posId.FIN_ANL, managerId: E['EMP-003'].id,
    employeeCode: 'EMP-008', firstName: 'Ana', lastName: 'Silva', email: 'ana.silva@acmedemo.com',
    phone: '+1 512 555 0118', gender: 'female', dateOfBirth: '1993-12-02', nationality: 'Brazilian',
    maritalStatus: 'single', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2024-04-01', employmentType: 'full_time', status: 'active' },
  { companyId, departmentId: deptId.SAL, jobPositionId: posId.SAL_REP, managerId: E['EMP-004'].id,
    employeeCode: 'EMP-009', firstName: 'Tom', lastName: 'Nguyen', email: 'tom.nguyen@acmedemo.com',
    phone: '+1 512 555 0119', gender: 'male', dateOfBirth: '1996-05-21', nationality: 'Vietnamese',
    maritalStatus: 'single', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: '2024-07-15', employmentType: 'full_time', status: 'active' },
  { companyId, departmentId: deptId.ENG, jobPositionId: posId.SWE, managerId: E['EMP-002'].id,
    employeeCode: 'EMP-010', firstName: 'Emma', lastName: 'Wilson', email: 'emma.wilson@acmedemo.com',
    phone: '+1 512 555 0120', gender: 'female', dateOfBirth: '2001-10-14', nationality: 'American',
    maritalStatus: 'single', city: 'Austin', state: 'TX', country: 'United States',
    hireDate: iso(addDays(TODAY, -60)), employmentType: 'intern', status: 'probation' },
]).returning();
for (const e of repRows) E[e.employeeCode] = e;
console.log(`employees: ${Object.keys(E).length} (4 managers + 6 reports)`);

// --- link department managers --------------------------------------------------
await db.update(s.departments).set({ managerId: E['EMP-001'].id }).where(eq(s.departments.id, deptId.HR));
await db.update(s.departments).set({ managerId: E['EMP-002'].id }).where(eq(s.departments.id, deptId.ENG));
await db.update(s.departments).set({ managerId: E['EMP-003'].id }).where(eq(s.departments.id, deptId.FIN));
await db.update(s.departments).set({ managerId: E['EMP-004'].id }).where(eq(s.departments.id, deptId.SAL));

// --- contracts ------------------------------------------------------------------
// Every employee gets an active contract; Robert (EMP-002) and James (EMP-005)
// additionally have an expired earlier contract, demonstrating multiple
// contracts over time. Active contracts link to the STD_MONTHLY structure.
await db.insert(s.contracts).values([
  // Robert: fixed-term → permanent (2 contracts over time)
  { employeeId: E['EMP-002'].id, companyId, jobPositionId: posId.SWE, workingScheduleId: schedId.FLEX40,
    salaryStructureId: structureId, contractType: 'fixed_term', title: 'Software Engineer',
    referenceNo: 'CT-2022-001', startDate: '2022-05-02', endDate: '2023-05-01', noticePeriodDays: 30,
    salaryAmount: '78000.00', payFrequency: 'monthly', currency: 'USD', signedOn: '2022-04-25',
    status: 'expired', terms: 'Initial 12-month fixed-term engagement.' },
  { employeeId: E['EMP-002'].id, companyId, jobPositionId: posId.SR_SWE, workingScheduleId: schedId.FLEX40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'Senior Software Engineer',
    referenceNo: 'CT-2023-001', startDate: '2023-05-02', endDate: null, probationEndDate: '2023-08-02',
    noticePeriodDays: 30, salaryAmount: '120000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2023-04-24', status: 'active', terms: 'Permanent full-time after successful conversion.' },
  // James: internship → permanent (2 contracts over time)
  { employeeId: E['EMP-005'].id, companyId, jobPositionId: posId.SWE, workingScheduleId: schedId.FLEX40,
    salaryStructureId: structureId, contractType: 'internship', title: 'Software Engineering Intern',
    referenceNo: 'CT-2023-002', startDate: '2023-06-12', endDate: '2023-12-11',
    salaryAmount: '48000.00', payFrequency: 'monthly', currency: 'USD', signedOn: '2023-06-05',
    status: 'expired', terms: 'Six-month internship with conversion review.' },
  { employeeId: E['EMP-005'].id, companyId, jobPositionId: posId.SWE, workingScheduleId: schedId.FLEX40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'Software Engineer',
    referenceNo: 'CT-2023-003', startDate: '2023-12-12', endDate: null, probationEndDate: '2024-03-12',
    noticePeriodDays: 30, salaryAmount: '82000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2023-12-01', status: 'active', terms: 'Converted to permanent employment.' },
  // Remaining employees: single active permanent contract each
  { employeeId: E['EMP-001'].id, companyId, jobPositionId: posId.HR_MGR, workingScheduleId: schedId.STD40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'HR Manager',
    referenceNo: 'CT-2022-002', startDate: '2022-03-15', endDate: null, probationEndDate: '2022-06-15',
    noticePeriodDays: 30, salaryAmount: '95000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2022-03-08', status: 'active' },
  { employeeId: E['EMP-003'].id, companyId, jobPositionId: posId.PAY_OFF, workingScheduleId: schedId.STD40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'Payroll Officer',
    referenceNo: 'CT-2023-004', startDate: '2023-01-10', endDate: null, probationEndDate: '2023-04-10',
    noticePeriodDays: 30, salaryAmount: '85000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2023-01-03', status: 'active' },
  { employeeId: E['EMP-004'].id, companyId, jobPositionId: posId.SAL_REP, workingScheduleId: schedId.STD40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'Sales Manager',
    referenceNo: 'CT-2022-003', startDate: '2022-08-22', endDate: null, probationEndDate: '2022-11-22',
    noticePeriodDays: 30, salaryAmount: '88000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2022-08-15', status: 'active' },
  { employeeId: E['EMP-006'].id, companyId, jobPositionId: posId.QA_ENG, workingScheduleId: schedId.FLEX40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'QA Engineer',
    referenceNo: 'CT-2023-005', startDate: '2023-09-04', endDate: null, probationEndDate: '2023-12-04',
    noticePeriodDays: 30, salaryAmount: '78000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2023-08-28', status: 'active' },
  { employeeId: E['EMP-007'].id, companyId, jobPositionId: posId.HR_SPEC, workingScheduleId: schedId.STD40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'HR Specialist',
    referenceNo: 'CT-2024-001', startDate: '2024-02-19', endDate: null, probationEndDate: '2024-05-19',
    noticePeriodDays: 30, salaryAmount: '62000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2024-02-12', status: 'active' },
  { employeeId: E['EMP-008'].id, companyId, jobPositionId: posId.FIN_ANL, workingScheduleId: schedId.STD40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'Financial Analyst',
    referenceNo: 'CT-2024-002', startDate: '2024-04-01', endDate: null, probationEndDate: '2024-07-01',
    noticePeriodDays: 30, salaryAmount: '72000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2024-03-25', status: 'active' },
  { employeeId: E['EMP-009'].id, companyId, jobPositionId: posId.SAL_REP, workingScheduleId: schedId.STD40,
    salaryStructureId: structureId, contractType: 'permanent', title: 'Sales Representative',
    referenceNo: 'CT-2024-003', startDate: '2024-07-15', endDate: null, probationEndDate: '2024-10-15',
    noticePeriodDays: 30, salaryAmount: '55000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: '2024-07-08', status: 'active' },
  { employeeId: E['EMP-010'].id, companyId, jobPositionId: posId.SWE, workingScheduleId: schedId.FLEX40,
    salaryStructureId: structureId, contractType: 'internship', title: 'Software Engineer Intern',
    referenceNo: `CT-${YEAR}-001`, startDate: iso(addDays(TODAY, -60)),
    endDate: iso(addDays(TODAY, 30)), noticePeriodDays: null,
    salaryAmount: '36000.00', payFrequency: 'monthly', currency: 'USD',
    signedOn: iso(addDays(TODAY, -67)), status: 'active', terms: 'Three-month internship.' },
]).returning();
console.log('contracts: 12 (10 active, 2 expired history for EMP-002 & EMP-005)');

// --- time off -----------------------------------------------------------------
// Types → per-employee allocations for this year → requests that draw on them.
const typeRows = await db.insert(s.timeOffTypes).values([
  { companyId, name: 'Annual Leave', code: 'ANNUAL', color: '#4CAF50', isPaid: true,
    isAccrued: true, accrualRate: '1.25', carryOverDays: 5, maxConsecutiveDays: 20, minNoticeDays: 7,
    description: 'Paid vacation accruing monthly.' },
  { companyId, name: 'Sick Leave', code: 'SICK', color: '#F44336', isPaid: true,
    carryOverDays: 0, maxConsecutiveDays: 5, minNoticeDays: 0,
    description: 'Paid sick days, certificate may be required.' },
  { companyId, name: 'Unpaid Leave', code: 'UNPAID', color: '#9E9E9E', isPaid: false,
    carryOverDays: 0, minNoticeDays: 14, description: 'Unpaid personal leave.' },
  { companyId, name: 'Training', code: 'TRAINING', color: '#2196F3', isPaid: true,
    carryOverDays: 0, maxConsecutiveDays: 10, minNoticeDays: 7,
    description: 'Paid professional development days.' },
]).returning();
const typeId = Object.fromEntries(typeRows.map((t) => [t.code, t.id]));

// Allocation per employee per type per year (uq_allocations_employee_type_year).
// Annual: 20 days (managers carry 3 over), Sick: 10 days.
const allocationAdjust = {
  'EMP-007': { ANNUAL: { usedDays: '5.00' } },    // David: approved leave
  'EMP-005': { SICK: { usedDays: '2.00' } },      // James: approved sick
  'EMP-006': { ANNUAL: { pendingDays: '5.00' } }, // Priya: pending request
};
const allocValues = [];
for (const code of Object.keys(E)) {
  for (const [typeCode, entitled] of [['ANNUAL', '20.00'], ['SICK', '10.00']]) {
    const carried = typeCode === 'ANNUAL' && ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004'].includes(code)
      ? '3.00' : '0.00';
    const adj = allocationAdjust[code]?.[typeCode] ?? {};
    const used = adj.usedDays ?? '0';
    const pending = adj.pendingDays ?? '0';
    // remaining = allocated + carried + additional - used - pending
    const remaining = (parseFloat(entitled) + parseFloat(carried)
      - parseFloat(used) - parseFloat(pending)).toFixed(2);
    const base = { companyId, employeeId: E[code].id, timeOffTypeId: typeId[typeCode],
      periodYear: YEAR, entitledDays: entitled, allocatedDays: entitled, carriedOverDays: carried,
      remainingDays: remaining,
      effectiveFrom: `${YEAR}-01-01`, effectiveTo: `${YEAR}-12-31`, status: 'active' };
    allocValues.push({ ...base, ...adj });
  }
}
const allocRows = await db.insert(s.allocations).values(allocValues).returning();
const allocId = (empCode, typeCode) =>
  allocRows.find((a) => a.employeeId === E[empCode].id && a.timeOffTypeId === typeId[typeCode]).id;
console.log(`time_off_types: ${typeRows.length} | allocations: ${allocRows.length}`);

// Requests: mix of approved (past), pending (future) and one rejected.
const past = pastWeekdays(25); // newest first
await db.insert(s.timeOffRequests).values([
  { companyId, employeeId: E['EMP-007'].id, timeOffTypeId: typeId.ANNUAL,
    allocationId: allocId('EMP-007', 'ANNUAL'),
    startDate: past[11], endDate: past[7], daysRequested: '5.00',
    reason: 'Family vacation', status: 'approved',
    approvedById: E['EMP-001'].id, approvedAt: at(past[14], 12, 0) },
  { companyId, employeeId: E['EMP-005'].id, timeOffTypeId: typeId.SICK,
    allocationId: allocId('EMP-005', 'SICK'),
    startDate: past[1], endDate: past[0], daysRequested: '2.00',
    reason: 'Flu with doctor certificate', status: 'approved',
    approvedById: E['EMP-001'].id, approvedAt: at(past[2], 10, 30) },
  { companyId, employeeId: E['EMP-006'].id, timeOffTypeId: typeId.ANNUAL,
    allocationId: allocId('EMP-006', 'ANNUAL'), ...(() => { const [st, en] = futureRange(14, 5);
      return { startDate: st, endDate: en }; })(),
    daysRequested: '5.00', reason: 'Trip to India', status: 'pending' },
  { companyId, employeeId: E['EMP-009'].id, timeOffTypeId: typeId.UNPAID,
    allocationId: null, ...(() => { const [st, en] = futureRange(21, 3);
      return { startDate: st, endDate: en }; })(),
    daysRequested: '3.00', reason: 'Personal matters', status: 'pending' },
  { companyId, employeeId: E['EMP-004'].id, timeOffTypeId: typeId.ANNUAL,
    allocationId: allocId('EMP-004', 'ANNUAL'),
    startDate: past[9], endDate: past[6], daysRequested: '4.00',
    reason: 'Requested after dates already passed', status: 'rejected',
    approvedById: E['EMP-001'].id, approvedAt: at(past[12], 9, 15) },
  { companyId, employeeId: E['EMP-002'].id, timeOffTypeId: typeId.TRAINING,
    allocationId: null, ...(() => { const [st, en] = futureRange(7, 2);
      return { startDate: st, endDate: en }; })(),
    daysRequested: '2.00', reason: 'AWS certification course', status: 'approved',
    approvedById: E['EMP-001'].id, approvedAt: at(past[3], 15, 0) },
]);
console.log('time_off_requests: 6 (3 approved, 2 pending, 1 rejected)');

// --- attendance ----------------------------------------------------------------
// Six employees over the last 10 weekdays (uq: one row per employee per day).
// Exceptions align with approved leave above (James sick days, David vacation
// days appear as `on_leave` attendance).
const days = pastWeekdays(10); // newest first
const attendees = [
  { code: 'EMP-001', schedule: 'STD40', approver: null },
  { code: 'EMP-002', schedule: 'FLEX40', approver: 'EMP-001' },
  { code: 'EMP-005', schedule: 'FLEX40', approver: 'EMP-001' },
  { code: 'EMP-006', schedule: 'FLEX40', approver: 'EMP-002' },
  { code: 'EMP-007', schedule: 'STD40', approver: 'EMP-001' },
  { code: 'EMP-008', schedule: 'STD40', approver: 'EMP-001' },
];
// Per-employee overrides by weekday index (0 = most recent weekday).
const overrides = {
  'EMP-002': { 0: { status: 'late', clockIn: [14, 35], workHours: '7.75', note: 'Arrived 35 minutes late' },
               4: { clockOut: [23, 45], workHours: '8.75', overtime: '1.25', note: 'Release deployment' } },
  'EMP-005': { 0: { status: 'on_leave', note: 'Approved sick leave' },
               1: { status: 'on_leave', note: 'Approved sick leave' } },
  'EMP-006': { 2: { status: 'remote', source: 'mobile', breaks: 45, clockOut: [22, 45], workHours: '8.00', note: 'Working from home' },
               7: { status: 'half_day', clockOut: [18, 30], breaks: 30, workHours: '4.00', note: 'Half day — afternoon off' } },
  'EMP-007': { 5: { status: 'absent', note: 'No-show, pending explanation' },
               7: { status: 'on_leave', note: 'Approved annual leave' },
               8: { status: 'on_leave', note: 'Approved annual leave' },
               9: { status: 'on_leave', note: 'Approved annual leave' } },
  'EMP-008': { 4: { status: 'half_day', clockOut: [18, 30], breaks: 30, workHours: '4.00', note: 'Half day — morning only' } },
};

const attRows = [];
for (const a of attendees) {
  const ov = overrides[a.code] ?? {};
  for (let i = 0; i < days.length; i += 1) {
    const dateIso = days[i];
    const o = ov[i] ?? {};
    const status = o.status ?? 'present';
    const flex = a.schedule === 'FLEX40';
    const needsClock = ['present', 'late', 'remote', 'half_day'].includes(status);
    const [inH, inM] = o.clockIn ?? [14, 0];
    const [outH, outM] = o.clockOut ?? (flex ? [22, 45] : [22, 30]);
    const needsApproval = ['late', 'absent', 'half_day', 'on_leave'].includes(status);
    attRows.push({
      employeeId: E[a.code].id,
      workingScheduleId: schedId[a.schedule],
      attendanceDate: dateIso,
      clockIn: needsClock ? at(dateIso, inH, inM) : null,
      clockOut: needsClock ? at(dateIso, outH, outM) : null,
      breaksDurationMinutes: needsClock ? (o.breaks ?? 60) : 0,
      workHours: needsClock ? (o.workHours ?? (flex ? '8.00' : '7.50')) : null,
      overtimeHours: o.overtime ?? '0',
      status,
      source: o.source ?? (needsApproval ? 'manual' : 'device'),
      notes: o.note ?? null,
      approvedById: needsApproval && a.approver ? E[a.approver].id : null,
      approvedAt: needsApproval && a.approver ? at(dateIso, 12, 0) : null,
    });
  }
}
await db.insert(s.attendances).values(attRows);
console.log(`attendances: ${attRows.length} rows across ${attendees.length} employees`);

// --- summary + relational sanity check ------------------------------------------
const count = async (t) => (await db.select({ n: sql`count(*)::int` }).from(t))[0].n;
const [nContracts, nReqs] = await Promise.all([count(s.contracts), count(s.timeOffRequests)]);
console.log('--- counts ---');
console.log(`roles ${await count(s.roles)} | users ${await count(s.users)} | companies ${await count(s.companies)} | departments ${await count(s.departments)}`);
console.log(`job_positions ${await count(s.jobPositions)} | working_schedules ${await count(s.workingSchedules)} | employees ${await count(s.employees)} | contracts ${nContracts}`);
console.log(`salary_structures ${await count(s.salaryStructures)} | salary_rules ${await count(s.salaryRules)} | attendances ${await count(s.attendances)}`);
console.log(`time_off_types ${await count(s.timeOffTypes)} | allocations ${await count(s.allocations)} | time_off_requests ${nReqs}`);

const demo = await db.query.employees.findFirst({
  where: eq(s.employees.employeeCode, 'EMP-005'),
  with: { department: true, manager: true, contracts: true, attendances: true, allocations: true, timeOffRequests: true },
});
console.log('--- relational check (db.query) ---');
console.log(`${demo.firstName} ${demo.lastName}: dept=${demo.department.name}, manager=${demo.manager?.lastName ?? '—'}, ` +
  `${demo.contracts.length} contracts, ${demo.attendances.length} attendance rows, ` +
  `${demo.allocations.length} allocations, ${demo.timeOffRequests.length} time-off requests`);
console.log('Seed complete ✔');







