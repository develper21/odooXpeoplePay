// db/seed.mjs
// Seeds complete Northstar Technologies demo dataset directly from frontend mock into PostgreSQL.
//
// Idempotent: truncates every HRMS table (RESTART IDENTITY CASCADE),
// then re-inserts a cohesive, complete dataset matching frontend mock data.
//
// Run from backend/: npm run db:seed

import { loadEnvFile } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

import * as s from '../lib/schema.js';

// --- environment ------------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '../.env.local');
if (fs.existsSync(envPath)) loadEnvFile(envPath);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (expected in backend/.env.local).');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema: s });

const PASSWORD_HASH = await bcrypt.hash('Password123!', 12);

console.log('Seeding Northstar Technologies dataset into PostgreSQL…');
console.log('Resetting existing tables (TRUNCATE … RESTART IDENTITY CASCADE)…');

await db.execute(sql`TRUNCATE TABLE payslip_lines, payslips, payruns, salary_rules,
  salary_structures, contracts, attendances, time_off_requests, allocations,
  time_off_types, employees, job_positions, working_schedules, departments,
  companies, users, roles RESTART IDENTITY CASCADE`);

// ---------------------------------------------------------------------------
// 1. ROLES
// ---------------------------------------------------------------------------
const roleRows = await db.insert(s.roles).values([
  {
    name: 'Administrator',
    code: 'ADMIN',
    isSystem: true,
    permissions: ['*'],
    description: 'Full access to every HRMS module.',
  },
  {
    name: 'HR Manager',
    code: 'HR_MANAGER',
    isSystem: true,
    permissions: ['*'],
    description: 'Manages people operations and approves leave.',
  },
  {
    name: 'HR Payroll Manager',
    code: 'HR_PAYROLL_MANAGER',
    isSystem: true,
    permissions: ['*'],
    description: 'Full control over HR and payroll-related records.',
  },
  {
    name: 'HR Payroll User',
    code: 'HR_PAYROLL_USER',
    isSystem: true,
    permissions: [
      'employees:*',
      'attendance:*',
      'contracts:*',
      'schedules:*',
      'time_off:*',
      'payroll:*',
      'payruns:*',
      'payslips:*',
      'salary_structures:*',
      'salary_rules:*',
      'reports:read',
      'dashboard:read',
    ],
    description: 'HR and payroll processing with salary access.',
  },
  {
    name: 'Employee',
    code: 'EMPLOYEE',
    isSystem: true,
    permissions: [
      'profile:read',
      'employees:read',
      'contracts:read',
      'schedules:read',
      'attendance:*',
      'time_off:*',
      'payroll:read',
      'payruns:read',
      'payslips:*',
      'dashboard:read',
    ],
    description: 'Employee self-service and team workspace access.',
  },
]).returning();

const roleMap = Object.fromEntries(roleRows.map((r) => [r.code, r.id]));
console.log(`✓ Seeded ${roleRows.length} roles`);

// ---------------------------------------------------------------------------
// 2. COMPANY: Northstar Technologies
// ---------------------------------------------------------------------------
const [company] = await db.insert(s.companies).values({
  name: 'Northstar Technologies',
  legalName: 'Northstar Technologies Inc.',
  taxId: 'US-NORTH-0001',
  email: 'contact@northstar.io',
  phone: '+1 212 555 0100',
  currency: 'INR',
  address: '100 Innovation Way, Suite 500',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'United States',
  status: 'active',
}).returning();

const companyId = company.id;
console.log(`✓ Seeded company: ${company.name} (id: ${companyId})`);

// ---------------------------------------------------------------------------
// 3. DEPARTMENTS
// ---------------------------------------------------------------------------
const deptDefs = [
  { name: 'Engineering', code: 'ENG', description: 'Product development and engineering team' },
  { name: 'People', code: 'HR', description: 'People operations and human resources' },
  { name: 'Operations', code: 'OPS', description: 'Business operations and logistics' },
  { name: 'Finance', code: 'FIN', description: 'Financial planning, accounting and payroll' },
  { name: 'Sales', code: 'SLS', description: 'Revenue generation and enterprise sales' },
  { name: 'Marketing', code: 'MKT', description: 'Growth, communications and brand' },
  { name: 'Administration', code: 'ADM', description: 'Executive leadership and office admin' },
];

const deptRows = await db.insert(s.departments).values(
  deptDefs.map((d) => ({ companyId, ...d, status: 'active' }))
).returning();

const deptMap = Object.fromEntries(deptRows.map((d) => [d.name, d.id]));
console.log(`✓ Seeded ${deptRows.length} departments`);

// ---------------------------------------------------------------------------
// 4. JOB POSITIONS
// ---------------------------------------------------------------------------
const posDefs = [
  { title: 'Staff Engineer', code: 'STAFF_ENG', department: 'Engineering', employmentType: 'full_time', salaryMin: '8000', salaryMax: '12000' },
  { title: 'Product Engineer', code: 'PROD_ENG', department: 'Engineering', employmentType: 'full_time', salaryMin: '7000', salaryMax: '10000' },
  { title: 'QA Engineer', code: 'QA_ENG', department: 'Engineering', employmentType: 'full_time', salaryMin: '5000', salaryMax: '8000' },
  { title: 'VP Engineering', code: 'VP_ENG', department: 'Engineering', employmentType: 'full_time', salaryMin: '12000', salaryMax: '18000' },
  { title: 'HR Manager', code: 'HR_MGR', department: 'People', employmentType: 'full_time', salaryMin: '6000', salaryMax: '9000' },
  { title: 'Operations Coordinator', code: 'OPS_COORD', department: 'Operations', employmentType: 'full_time', salaryMin: '4000', salaryMax: '6500' },
  { title: 'Operations Associate', code: 'OPS_ASSOC', department: 'Operations', employmentType: 'part_time', salaryMin: '2500', salaryMax: '4000' },
  { title: 'Operations Manager', code: 'OPS_MGR', department: 'Operations', employmentType: 'full_time', salaryMin: '7000', salaryMax: '10000' },
  { title: 'Payroll Specialist', code: 'PAY_SPEC', department: 'Finance', employmentType: 'full_time', salaryMin: '5000', salaryMax: '7500' },
  { title: 'Payroll Manager', code: 'PAY_MGR', department: 'Finance', employmentType: 'full_time', salaryMin: '8000', salaryMax: '12000' },
  { title: 'Finance Director', code: 'FIN_DIR', department: 'Finance', employmentType: 'full_time', salaryMin: '10000', salaryMax: '15000' },
  { title: 'Sales Director', code: 'SALES_DIR', department: 'Sales', employmentType: 'full_time', salaryMin: '9000', salaryMax: '14000' },
  { title: 'Account Executive', code: 'ACC_EXEC', department: 'Sales', employmentType: 'contract', salaryMin: '4500', salaryMax: '7000' },
  { title: 'Brand Designer', code: 'BRAND_DES', department: 'Marketing', employmentType: 'full_time', salaryMin: '5500', salaryMax: '8000' },
  { title: 'Marketing Director', code: 'MKT_DIR', department: 'Marketing', employmentType: 'full_time', salaryMin: '9000', salaryMax: '13000' },
  { title: 'Chief Operating Officer', code: 'COO', department: 'Administration', employmentType: 'full_time', salaryMin: '14000', salaryMax: '20000' },
];

const posRows = await db.insert(s.jobPositions).values(
  posDefs.map((p) => ({
    companyId,
    departmentId: deptMap[p.department],
    title: p.title,
    code: p.code,
    employmentType: p.employmentType,
    salaryMin: p.salaryMin,
    salaryMax: p.salaryMax,
    status: 'active',
  }))
).returning();

const posMap = Object.fromEntries(posRows.map((p) => [p.title, p.id]));
console.log(`✓ Seeded ${posRows.length} job positions`);

// ---------------------------------------------------------------------------
// 5. WORKING SCHEDULES
// ---------------------------------------------------------------------------
const scheduleRows = await db.insert(s.workingSchedules).values([
  {
    companyId,
    name: 'Standard 40 Hours',
    code: 'SCH-001',
    description: 'Monday to Friday, 9:00 AM - 6:00 PM with 1h lunch break.',
    workDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    startTime: '09:00:00',
    endTime: '18:00:00',
    breakStartTime: '13:00:00',
    breakEndTime: '14:00:00',
    weeklyHours: '40.00',
    timezone: 'America/New_York',
    isFlexible: false,
    status: 'active',
  },
  {
    companyId,
    name: 'Sales Flex',
    code: 'SCH-002',
    description: 'Flexible sales schedule, 8:30 AM - 5:30 PM.',
    workDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    startTime: '08:30:00',
    endTime: '17:30:00',
    breakStartTime: '12:30:00',
    breakEndTime: '13:30:00',
    weeklyHours: '40.00',
    timezone: 'America/Chicago',
    isFlexible: true,
    status: 'active',
  },
  {
    companyId,
    name: 'Part-time Support',
    code: 'SCH-003',
    description: 'Part-time MWF schedule, 24 hours per week.',
    workDays: ['MON', 'WED', 'FRI'],
    startTime: '09:00:00',
    endTime: '18:00:00',
    breakStartTime: '13:00:00',
    breakEndTime: '13:30:00',
    weeklyHours: '24.00',
    timezone: 'America/New_York',
    isFlexible: false,
    status: 'active',
  },
  {
    companyId,
    name: 'Operations Shift',
    code: 'SCH-004',
    description: 'Monday to Thursday compressed shift, 10:00 AM - 7:00 PM.',
    workDays: ['MON', 'TUE', 'WED', 'THU'],
    startTime: '10:00:00',
    endTime: '19:00:00',
    breakStartTime: '14:00:00',
    breakEndTime: '14:45:00',
    weeklyHours: '36.00',
    timezone: 'America/New_York',
    isFlexible: false,
    status: 'active',
  },
  {
    companyId,
    name: 'Legacy Schedule',
    code: 'SCH-005',
    description: 'Deprecated historical working schedule.',
    workDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    weeklyHours: '40.00',
    timezone: 'America/New_York',
    status: 'inactive',
  },
]).returning();

const schedMap = Object.fromEntries(scheduleRows.map((r, i) => [`sch-00${i + 1}`, r.id]));
console.log(`✓ Seeded ${scheduleRows.length} working schedules`);

// ---------------------------------------------------------------------------
// 6. SALARY STRUCTURES & RULES
// ---------------------------------------------------------------------------
const structRows = await db.insert(s.salaryStructures).values([
  {
    companyId,
    name: 'Regular Salary',
    code: 'SS-001',
    description: 'Standard permanent employment salary structure with housing, transport, PF, and TDS calculation.',
    currency: 'INR',
    payFrequency: 'monthly',
    status: 'active',
  },
  {
    companyId,
    name: 'Sales & Executive Salary',
    code: 'SS-002',
    description: 'Executive and sales structure including base wage, housing, transport, sales commission, PF, and tax.',
    currency: 'INR',
    payFrequency: 'monthly',
    status: 'active',
  },
  {
    companyId,
    name: 'Part-Time Salary',
    code: 'SS-003',
    description: 'Hourly and part-time staff structure with commuting support and simplified tax withholding.',
    currency: 'INR',
    payFrequency: 'monthly',
    status: 'active',
  },
  {
    companyId,
    name: 'Contractor Salary',
    code: 'SS-004',
    description: 'Professional services retainer structure with Section 194J TDS deduction.',
    currency: 'INR',
    payFrequency: 'monthly',
    status: 'active',
  },
]).returning();

const structMap = Object.fromEntries(structRows.map((r, i) => [`ss-00${i + 1}`, r.id]));
console.log(`✓ Seeded ${structRows.length} salary structures`);

// Rules for SS-001 (Regular Salary)
const ss1Rules = await db.insert(s.salaryRules).values([
  { salaryStructureId: structMap['ss-001'], code: 'BASIC', name: 'Basic Salary', type: 'earning', calculationType: 'fixed', amount: '60000.00', computationOrder: 10, isActive: true },
  { salaryStructureId: structMap['ss-001'], code: 'HRA', name: 'Housing Allowance', type: 'earning', calculationType: 'percentage', percentage: '20.00', percentageBase: 'basic', computationOrder: 20, isActive: true },
  { salaryStructureId: structMap['ss-001'], code: 'TRANSPORT', name: 'Transport Allowance', type: 'earning', calculationType: 'fixed', amount: '5000.00', computationOrder: 30, isActive: true },
  { salaryStructureId: structMap['ss-001'], code: 'GROSS', name: 'Gross Salary', type: 'earning', calculationType: 'fixed', amount: '77000.00', computationOrder: 40, isActive: true },
  { salaryStructureId: structMap['ss-001'], code: 'PF', name: 'Provident Fund', type: 'deduction', calculationType: 'percentage', percentage: '12.00', percentageBase: 'basic', computationOrder: 60, isActive: true },
  { salaryStructureId: structMap['ss-001'], code: 'TAX', name: 'Income Tax', type: 'deduction', calculationType: 'percentage', percentage: '10.00', percentageBase: 'gross', computationOrder: 70, isActive: true },
  { salaryStructureId: structMap['ss-001'], code: 'NET', name: 'Net Salary', type: 'earning', calculationType: 'fixed', amount: '62100.00', computationOrder: 90, isActive: true },
]).returning();

// Rules for SS-002 (Sales & Executive)
await db.insert(s.salaryRules).values([
  { salaryStructureId: structMap['ss-002'], code: 'BASIC', name: 'Basic Salary', type: 'earning', calculationType: 'fixed', amount: '60000.00', computationOrder: 10, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'HRA', name: 'Housing Allowance', type: 'earning', calculationType: 'percentage', percentage: '20.00', percentageBase: 'basic', computationOrder: 20, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'TRANSPORT', name: 'Transport Allowance', type: 'earning', calculationType: 'fixed', amount: '5000.00', computationOrder: 30, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'COMMISSION', name: 'Sales Commission', type: 'earning', calculationType: 'fixed', amount: '12000.00', computationOrder: 38, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'GROSS', name: 'Gross Salary', type: 'earning', calculationType: 'fixed', amount: '89000.00', computationOrder: 40, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'PF', name: 'Provident Fund', type: 'deduction', calculationType: 'percentage', percentage: '12.00', percentageBase: 'basic', computationOrder: 60, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'PROF_TAX', name: 'Professional Tax', type: 'deduction', calculationType: 'fixed', amount: '200.00', computationOrder: 65, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'TAX', name: 'Income Tax', type: 'deduction', calculationType: 'percentage', percentage: '10.00', percentageBase: 'gross', computationOrder: 70, isActive: true },
  { salaryStructureId: structMap['ss-002'], code: 'NET', name: 'Net Salary', type: 'earning', calculationType: 'fixed', amount: '72600.00', computationOrder: 90, isActive: true },
]);

// Rules for SS-003 (Part-Time)
await db.insert(s.salaryRules).values([
  { salaryStructureId: structMap['ss-003'], code: 'HOURLY_BASE', name: 'Part-Time Base', type: 'earning', calculationType: 'fixed', amount: '28000.00', computationOrder: 10, isActive: true },
  { salaryStructureId: structMap['ss-003'], code: 'TRANSPORT', name: 'Transport Allowance', type: 'earning', calculationType: 'fixed', amount: '5000.00', computationOrder: 30, isActive: true },
  { salaryStructureId: structMap['ss-003'], code: 'GROSS', name: 'Gross Salary', type: 'earning', calculationType: 'fixed', amount: '33000.00', computationOrder: 40, isActive: true },
  { salaryStructureId: structMap['ss-003'], code: 'PROF_TAX', name: 'Professional Tax', type: 'deduction', calculationType: 'fixed', amount: '200.00', computationOrder: 65, isActive: true },
  { salaryStructureId: structMap['ss-003'], code: 'TAX', name: 'Income Tax', type: 'deduction', calculationType: 'percentage', percentage: '10.00', percentageBase: 'gross', computationOrder: 70, isActive: true },
  { salaryStructureId: structMap['ss-003'], code: 'NET', name: 'Net Salary', type: 'earning', calculationType: 'fixed', amount: '29500.00', computationOrder: 90, isActive: true },
]);

// Rules for SS-004 (Contractor)
await db.insert(s.salaryRules).values([
  { salaryStructureId: structMap['ss-004'], code: 'CONSULTANT_FEE', name: 'Professional Fee', type: 'earning', calculationType: 'fixed', amount: '85000.00', computationOrder: 10, isActive: true },
  { salaryStructureId: structMap['ss-004'], code: 'TDS_CONTRACTOR', name: 'TDS Withholding (194J)', type: 'deduction', calculationType: 'percentage', percentage: '10.00', percentageBase: 'basic', computationOrder: 70, isActive: true },
  { salaryStructureId: structMap['ss-004'], code: 'NET', name: 'Net Salary', type: 'earning', calculationType: 'fixed', amount: '76500.00', computationOrder: 90, isActive: true },
]);

console.log('✓ Seeded salary rules for all structures');

// ---------------------------------------------------------------------------
// 7. USERS (Northstar Accounts)
// ---------------------------------------------------------------------------
const userAccounts = [
  { email: 'arjun.mehta@northstar.io', role: 'ADMIN', firstName: 'Arjun', lastName: 'Mehta', phone: '+1 212 555 0150' },
  { email: 'priya.shah@northstar.io', role: 'HR_MANAGER', firstName: 'Priya', lastName: 'Shah', phone: '+1 212 555 0143' },
  { email: 'neha.jain@northstar.io', role: 'HR_PAYROLL_MANAGER', firstName: 'Neha', lastName: 'Jain', phone: '+1 212 555 0149' },
  { email: 'amit.patel@northstar.io', role: 'HR_PAYROLL_USER', firstName: 'Amit', lastName: 'Patel', phone: '+1 212 555 0152' },
  { email: 'rahul.sharma@northstar.io', role: 'EMPLOYEE', firstName: 'Rahul', lastName: 'Sharma', phone: '+1 212 555 0141' },
  { email: 'alex.davis@northstar.io', role: 'ADMIN', firstName: 'Alex', lastName: 'Davis', phone: '+1 212 555 0156' },
  { email: 'vikram.malhotra@northstar.io', role: 'EMPLOYEE', firstName: 'Vikram', lastName: 'Malhotra', phone: '+1 212 555 0157' },
  { email: 'ananya.roy@northstar.io', role: 'HR_MANAGER', firstName: 'Ananya', lastName: 'Roy', phone: '+1 212 555 0158' },
  { email: 'rohan.sen@northstar.io', role: 'EMPLOYEE', firstName: 'Rohan', lastName: 'Sen', phone: '+1 212 555 0159' },
  { email: 'admin@northstar.io', role: 'ADMIN', firstName: 'System', lastName: 'Admin', phone: '+1 212 555 0101' },
  // Additional employee accounts matching mockEmployees for seamless login
  { email: 'maya.patel@northstar.io', role: 'EMPLOYEE', firstName: 'Maya', lastName: 'Patel', phone: '+1 212 555 0142' },
  { email: 'theo.meyer@northstar.io', role: 'EMPLOYEE', firstName: 'Theo', lastName: 'Meyer', phone: '+1 212 555 0144' },
  { email: 'rina.shah@northstar.io', role: 'EMPLOYEE', firstName: 'Rina', lastName: 'Shah', phone: '+1 212 555 0145' },
  { email: 'daniel.kim@northstar.io', role: 'EMPLOYEE', firstName: 'Daniel', lastName: 'Kim', phone: '+1 212 555 0146' },
  { email: 'sofia.alvarez@northstar.io', role: 'EMPLOYEE', firstName: 'Sofia', lastName: 'Alvarez', phone: '+1 212 555 0147' },
  { email: 'owen.brooks@northstar.io', role: 'EMPLOYEE', firstName: 'Owen', lastName: 'Brooks', phone: '+1 212 555 0148' },
  { email: 'liam.oconnor@northstar.io', role: 'EMPLOYEE', firstName: 'Liam', lastName: "O'Connor", phone: '+1 212 555 0151' },
  { email: 'elena.rossi@northstar.io', role: 'EMPLOYEE', firstName: 'Elena', lastName: 'Rossi', phone: '+1 212 555 0153' },
  { email: 'marcus.green@northstar.io', role: 'EMPLOYEE', firstName: 'Marcus', lastName: 'Green', phone: '+1 212 555 0154' },
  { email: 'nora.williams@northstar.io', role: 'EMPLOYEE', firstName: 'Nora', lastName: 'Williams', phone: '+1 212 555 0155' },
  { email: 'samir.khan@northstar.io', role: 'EMPLOYEE', firstName: 'Samir', lastName: 'Khan', phone: '+1 212 555 0160' },
];

const userRows = await db.insert(s.users).values(
  userAccounts.map((u) => ({
    roleId: roleMap[u.role],
    email: u.email,
    passwordHash: PASSWORD_HASH,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    isActive: true,
  }))
).returning();

const userMap = Object.fromEntries(userRows.map((u) => [u.email, u.id]));
console.log(`✓ Seeded ${userRows.length} users with shared password 'Password123!'`);

// ---------------------------------------------------------------------------
// 8. EMPLOYEES (16 Employees from mockEmployees)
// ---------------------------------------------------------------------------
const rawEmployees = [
  { id: 'emp-001', code: 'EMP-001', first: 'Rahul', last: 'Sharma', email: 'rahul.sharma@northstar.io', phone: '+1 212 555 0141', dept: 'Engineering', pos: 'Staff Engineer', mgr: 'emp-006', status: 'active', empType: 'full_time', hire: '2021-04-12', gender: 'male' },
  { id: 'emp-002', code: 'EMP-002', first: 'Maya', last: 'Patel', email: 'maya.patel@northstar.io', phone: '+1 212 555 0142', dept: 'Engineering', pos: 'Product Engineer', mgr: 'emp-006', status: 'active', empType: 'full_time', hire: '2022-08-01', gender: 'female' },
  { id: 'emp-003', code: 'EMP-003', first: 'Priya', last: 'Shah', email: 'priya.shah@northstar.io', phone: '+1 212 555 0143', dept: 'People', pos: 'HR Manager', mgr: 'emp-010', status: 'active', empType: 'full_time', hire: '2020-11-09', gender: 'female' },
  { id: 'emp-004', code: 'EMP-004', first: 'Theo', last: 'Meyer', email: 'theo.meyer@northstar.io', phone: '+1 212 555 0144', dept: 'Operations', pos: 'Operations Coordinator', mgr: 'emp-011', status: 'active', empType: 'full_time', hire: '2024-01-15', gender: 'male' },
  { id: 'emp-005', code: 'EMP-005', first: 'Rina', last: 'Shah', email: 'rina.shah@northstar.io', phone: '+1 212 555 0145', dept: 'Finance', pos: 'Payroll Specialist', mgr: 'emp-012', status: 'active', empType: 'full_time', hire: '2023-05-22', gender: 'female' },
  { id: 'emp-006', code: 'EMP-006', first: 'Daniel', last: 'Kim', email: 'daniel.kim@northstar.io', phone: '+1 212 555 0146', dept: 'Engineering', pos: 'VP Engineering', mgr: null, status: 'active', empType: 'full_time', hire: '2019-02-04', gender: 'male' },
  { id: 'emp-007', code: 'EMP-007', first: 'Sofia', last: 'Alvarez', email: 'sofia.alvarez@northstar.io', phone: '+1 212 555 0147', dept: 'Sales', pos: 'Sales Director', mgr: null, status: 'terminated', empType: 'full_time', hire: '2018-09-17', gender: 'female' },
  { id: 'emp-008', code: 'EMP-008', first: 'Owen', last: 'Brooks', email: 'owen.brooks@northstar.io', phone: '+1 212 555 0148', dept: 'Operations', pos: 'Operations Associate', mgr: 'emp-011', status: 'active', empType: 'part_time', hire: '2024-03-18', gender: 'male' },
  { id: 'emp-009', code: 'EMP-009', first: 'Neha', last: 'Jain', email: 'neha.jain@northstar.io', phone: '+1 212 555 0149', dept: 'Finance', pos: 'Payroll Manager', mgr: 'emp-012', status: 'active', empType: 'full_time', hire: '2021-07-26', gender: 'female' },
  { id: 'emp-010', code: 'EMP-010', first: 'Arjun', last: 'Mehta', email: 'arjun.mehta@northstar.io', phone: '+1 212 555 0150', dept: 'Administration', pos: 'Chief Operating Officer', mgr: null, status: 'active', empType: 'full_time', hire: '2017-03-06', gender: 'male' },
  { id: 'emp-011', code: 'EMP-011', first: 'Liam', last: "O'Connor", email: 'liam.oconnor@northstar.io', phone: '+1 212 555 0151', dept: 'Operations', pos: 'Operations Manager', mgr: 'emp-010', status: 'active', empType: 'full_time', hire: '2019-10-21', gender: 'male' },
  { id: 'emp-012', code: 'EMP-012', first: 'Amit', last: 'Patel', email: 'amit.patel@northstar.io', phone: '+1 212 555 0152', dept: 'Finance', pos: 'Finance Director', mgr: 'emp-010', status: 'active', empType: 'full_time', hire: '2018-06-11', gender: 'male' },
  { id: 'emp-013', code: 'EMP-013', first: 'Elena', last: 'Rossi', email: 'elena.rossi@northstar.io', phone: '+1 212 555 0153', dept: 'Marketing', pos: 'Brand Designer', mgr: 'emp-014', status: 'on_leave', empType: 'full_time', hire: '2022-02-14', gender: 'female' },
  { id: 'emp-014', code: 'EMP-014', first: 'Marcus', last: 'Green', email: 'marcus.green@northstar.io', phone: '+1 212 555 0154', dept: 'Marketing', pos: 'Marketing Director', mgr: 'emp-010', status: 'active', empType: 'full_time', hire: '2020-04-27', gender: 'male' },
  { id: 'emp-015', code: 'EMP-015', first: 'Nora', last: 'Williams', email: 'nora.williams@northstar.io', phone: '+1 212 555 0155', dept: 'Sales', pos: 'Account Executive', mgr: 'emp-007', status: 'active', empType: 'contract', hire: '2025-01-06', gender: 'female' },
  { id: 'emp-016', code: 'EMP-016', first: 'Samir', last: 'Khan', email: 'samir.khan@northstar.io', phone: '+1 212 555 0160', dept: 'Engineering', pos: 'QA Engineer', mgr: 'emp-006', status: 'active', empType: 'full_time', hire: '2025-05-19', gender: 'male' },
];

const empInsertValues = rawEmployees.map((e) => ({
  companyId,
  userId: userMap[e.email] ?? null,
  departmentId: deptMap[e.dept],
  jobPositionId: posMap[e.pos],
  employeeCode: e.code,
  firstName: e.first,
  lastName: e.last,
  email: e.email,
  phone: e.phone,
  gender: e.gender,
  dateOfBirth: '1992-06-15',
  nationality: 'American',
  maritalStatus: 'single',
  address: '100 Innovation Way',
  city: 'New York',
  state: 'NY',
  country: 'United States',
  postalCode: '10001',
  hireDate: e.hire,
  employmentType: e.empType,
  status: e.status,
}));

const insertedEmployees = await db.insert(s.employees).values(empInsertValues).returning();
const empMap = Object.fromEntries(insertedEmployees.map((e) => [e.employeeCode, e.id]));
const empMockIdMap = Object.fromEntries(
  rawEmployees.map((e) => [e.id, empMap[e.code]])
);

// Second pass: link managerId
for (const e of rawEmployees) {
  if (e.mgr && empMockIdMap[e.mgr]) {
    await db.update(s.employees)
      .set({ managerId: empMockIdMap[e.mgr] })
      .where(eq(s.employees.id, empMockIdMap[e.id]));
  }
}

// Set department managers
await db.update(s.departments).set({ managerId: empMap['EMP-006'] }).where(eq(s.departments.id, deptMap['Engineering']));
await db.update(s.departments).set({ managerId: empMap['EMP-003'] }).where(eq(s.departments.id, deptMap['People']));
await db.update(s.departments).set({ managerId: empMap['EMP-011'] }).where(eq(s.departments.id, deptMap['Operations']));
await db.update(s.departments).set({ managerId: empMap['EMP-012'] }).where(eq(s.departments.id, deptMap['Finance']));
await db.update(s.departments).set({ managerId: empMap['EMP-007'] }).where(eq(s.departments.id, deptMap['Sales']));
await db.update(s.departments).set({ managerId: empMap['EMP-014'] }).where(eq(s.departments.id, deptMap['Marketing']));
await db.update(s.departments).set({ managerId: empMap['EMP-010'] }).where(eq(s.departments.id, deptMap['Administration']));

console.log(`✓ Seeded ${insertedEmployees.length} employees with hierarchy and department managers`);

// ---------------------------------------------------------------------------
// 9. CONTRACTS (from mockContracts)
// ---------------------------------------------------------------------------
const rawContracts = [
  { id: 'con-001', ref: 'CON-001', empId: 'emp-002', title: 'Permanent Employment', start: '2022-08-01', end: null, dept: 'Engineering', pos: 'Product Engineer', struct: 'ss-001', status: 'active', salary: '8800.00', type: 'permanent' },
  { id: 'con-002', ref: 'CON-002', empId: 'emp-003', title: 'Permanent Employment', start: '2020-11-09', end: null, dept: 'People', pos: 'HR Manager', struct: 'ss-001', status: 'active', salary: '7400.00', type: 'permanent' },
  { id: 'con-004', ref: 'CON-004', empId: 'emp-004', title: 'Fixed Term Contract', start: '2024-01-15', end: '2025-01-14', dept: 'Operations', pos: 'Operations Coordinator', struct: 'ss-001', status: 'expired', salary: '5100.00', type: 'fixed_term' },
  { id: 'con-005', ref: 'CON-005', empId: 'emp-005', title: 'Permanent Employment', start: '2023-05-22', end: null, dept: 'Finance', pos: 'Payroll Specialist', struct: 'ss-001', status: 'active', salary: '6200.00', type: 'permanent' },
  { id: 'con-006', ref: 'CON-006', empId: 'emp-006', title: 'Executive Employment', start: '2019-02-04', end: null, dept: 'Engineering', pos: 'VP Engineering', struct: 'ss-001', status: 'active', salary: '14200.00', type: 'permanent' },
  { id: 'con-007', ref: 'CON-007', empId: 'emp-007', title: 'Permanent Employment', start: '2018-09-17', end: '2026-02-28', dept: 'Sales', pos: 'Sales Director', struct: 'ss-002', status: 'expired', salary: '11800.00', type: 'permanent' },
  { id: 'con-008', ref: 'CON-008', empId: 'emp-008', title: 'Part-time Employment', start: '2024-03-18', end: null, dept: 'Operations', pos: 'Operations Associate', struct: 'ss-003', status: 'active', salary: '3200.00', type: 'permanent' },
  { id: 'con-009', ref: 'CON-009', empId: 'emp-009', title: 'Permanent Employment', start: '2021-07-26', end: null, dept: 'Finance', pos: 'Payroll Manager', struct: 'ss-001', status: 'active', salary: '9800.00', type: 'permanent' },
  { id: 'con-010', ref: 'CON-010', empId: 'emp-010', title: 'Executive Employment', start: '2017-03-06', end: null, dept: 'Administration', pos: 'Chief Operating Officer', struct: 'ss-001', status: 'active', salary: '15800.00', type: 'permanent' },
  { id: 'con-011', ref: 'CON-011', empId: 'emp-011', title: 'Permanent Employment', start: '2019-10-21', end: null, dept: 'Operations', pos: 'Operations Manager', struct: 'ss-001', status: 'active', salary: '8500.00', type: 'permanent' },
  { id: 'con-012', ref: 'CON-012', empId: 'emp-012', title: 'Permanent Employment', start: '2018-06-11', end: null, dept: 'Finance', pos: 'Finance Director', struct: 'ss-001', status: 'active', salary: '12600.00', type: 'permanent' },
  { id: 'con-013', ref: 'CON-013', empId: 'emp-001', title: 'Permanent Employment', start: '2026-01-01', end: null, dept: 'Engineering', pos: 'Staff Engineer', struct: 'ss-001', status: 'active', salary: '9200.00', type: 'permanent' },
  { id: 'con-014', ref: 'CON-014', empId: 'emp-013', title: 'Permanent Employment', start: '2022-02-14', end: null, dept: 'Marketing', pos: 'Brand Designer', struct: 'ss-001', status: 'active', salary: '6800.00', type: 'permanent' },
  { id: 'con-015', ref: 'CON-015', empId: 'emp-014', title: 'Permanent Employment', start: '2020-04-27', end: null, dept: 'Marketing', pos: 'Marketing Director', struct: 'ss-001', status: 'active', salary: '10400.00', type: 'permanent' },
  { id: 'con-016', ref: 'CON-016', empId: 'emp-015', title: 'Contractor Agreement', start: '2025-01-06', end: '2026-12-31', dept: 'Sales', pos: 'Account Executive', struct: 'ss-004', status: 'active', salary: '5600.00', type: 'contractor' },
  { id: 'con-017', ref: 'CON-017', empId: 'emp-001', title: 'Previous Employment', start: '2021-04-12', end: '2025-12-31', dept: 'Engineering', pos: 'Staff Engineer', struct: 'ss-001', status: 'expired', salary: '7800.00', type: 'permanent' },
];

const contractInsertValues = rawContracts.map((c) => ({
  companyId,
  employeeId: empMockIdMap[c.empId],
  jobPositionId: posMap[c.pos],
  workingScheduleId: schedMap['sch-001'],
  salaryStructureId: structMap[c.struct],
  contractType: c.type,
  title: c.title,
  referenceNo: c.ref,
  startDate: c.start,
  endDate: c.end,
  salaryAmount: c.salary,
  payFrequency: 'monthly',
  currency: 'INR',
  status: c.status,
}));

const insertedContracts = await db.insert(s.contracts).values(contractInsertValues).returning();
const contractMap = Object.fromEntries(
  rawContracts.map((c, i) => [c.id, insertedContracts[i].id])
);
console.log(`✓ Seeded ${insertedContracts.length} contracts`);

// ---------------------------------------------------------------------------
// 10. TIME OFF TYPES
// ---------------------------------------------------------------------------
const timeOffTypeRows = await db.insert(s.timeOffTypes).values([
  { companyId, name: 'Annual Leave', code: 'AL', color: '#4CAF50', isPaid: true, approvalRequired: true, carryOverDays: 5, description: 'Standard paid annual leave' },
  { companyId, name: 'Sick Leave', code: 'SL', color: '#F44336', isPaid: true, approvalRequired: true, carryOverDays: 0, description: 'Paid sick leave with certificate' },
  { companyId, name: 'Casual Leave', code: 'CL', color: '#FF9800', isPaid: false, approvalRequired: true, carryOverDays: 0, description: 'Short casual leave' },
  { companyId, name: 'Unpaid Leave', code: 'UL', color: '#9E9E9E', isPaid: false, approvalRequired: true, carryOverDays: 0, description: 'Unpaid personal leave' },
  { companyId, name: 'Compensatory Leave', code: 'COMP', color: '#2196F3', isPaid: false, approvalRequired: true, carryOverDays: 0, description: 'Overtime compensatory leave' },
]).returning();

const totMap = {
  'tot-001': timeOffTypeRows[0].id,
  'tot-002': timeOffTypeRows[1].id,
  'tot-003': timeOffTypeRows[2].id,
  'tot-004': timeOffTypeRows[3].id,
  'tot-005': timeOffTypeRows[4].id,
};
console.log(`✓ Seeded ${timeOffTypeRows.length} time-off types`);

// ---------------------------------------------------------------------------
// 11. TIME OFF ALLOCATIONS
// ---------------------------------------------------------------------------
const rawAllocations = [
  { id: 'alloc-001', empId: 'emp-001', totId: 'tot-001', allocatedDays: '24.00', usedDays: '6.00', remainingDays: '18.00', year: 2026, status: 'active' },
  { id: 'alloc-002', empId: 'emp-001', totId: 'tot-002', allocatedDays: '10.00', usedDays: '2.00', remainingDays: '8.00', year: 2026, status: 'active' },
  { id: 'alloc-003', empId: 'emp-001', totId: 'tot-003', allocatedDays: '5.00', usedDays: '1.00', remainingDays: '4.00', year: 2026, status: 'active' },
  { id: 'alloc-004', empId: 'emp-002', totId: 'tot-001', allocatedDays: '24.00', usedDays: '14.00', remainingDays: '10.00', year: 2026, status: 'active' },
  { id: 'alloc-005', empId: 'emp-002', totId: 'tot-002', allocatedDays: '10.00', usedDays: '3.00', remainingDays: '7.00', year: 2026, status: 'active' },
  { id: 'alloc-006', empId: 'emp-003', totId: 'tot-001', allocatedDays: '24.00', usedDays: '18.00', remainingDays: '6.00', year: 2026, status: 'active' },
  { id: 'alloc-007', empId: 'emp-003', totId: 'tot-002', allocatedDays: '10.00', usedDays: '0.00', remainingDays: '10.00', year: 2026, status: 'active' },
  { id: 'alloc-008', empId: 'emp-004', totId: 'tot-001', allocatedDays: '24.00', usedDays: '2.00', remainingDays: '22.00', year: 2026, status: 'active' },
  { id: 'alloc-009', empId: 'emp-005', totId: 'tot-001', allocatedDays: '24.00', usedDays: '5.00', remainingDays: '19.00', year: 2026, status: 'active' },
  { id: 'alloc-010', empId: 'emp-006', totId: 'tot-001', allocatedDays: '24.00', usedDays: '8.00', remainingDays: '16.00', year: 2026, status: 'active' },
  { id: 'alloc-011', empId: 'emp-008', totId: 'tot-001', allocatedDays: '24.00', usedDays: '12.00', remainingDays: '12.00', year: 2026, status: 'active' },
  { id: 'alloc-012', empId: 'emp-009', totId: 'tot-001', allocatedDays: '24.00', usedDays: '0.00', remainingDays: '24.00', year: 2026, status: 'active' },
  { id: 'alloc-013', empId: 'emp-011', totId: 'tot-001', allocatedDays: '24.00', usedDays: '10.00', remainingDays: '14.00', year: 2026, status: 'active' },
  { id: 'alloc-014', empId: 'emp-012', totId: 'tot-001', allocatedDays: '24.00', usedDays: '3.00', remainingDays: '21.00', year: 2026, status: 'active' },
  { id: 'alloc-015', empId: 'emp-013', totId: 'tot-001', allocatedDays: '24.00', usedDays: '15.00', remainingDays: '9.00', year: 2026, status: 'active' },
  { id: 'alloc-016', empId: 'emp-014', totId: 'tot-001', allocatedDays: '24.00', usedDays: '7.00', remainingDays: '17.00', year: 2026, status: 'active' },
  { id: 'alloc-017', empId: 'emp-015', totId: 'tot-001', allocatedDays: '24.00', usedDays: '4.00', remainingDays: '20.00', year: 2026, status: 'active' },
  { id: 'alloc-018', empId: 'emp-016', totId: 'tot-001', allocatedDays: '24.00', usedDays: '2.00', remainingDays: '22.00', year: 2026, status: 'active' },
  { id: 'alloc-019', empId: 'emp-001', totId: 'tot-005', allocatedDays: '16.00', usedDays: '0.00', remainingDays: '16.00', year: 2026, status: 'active' },
  { id: 'alloc-020', empId: 'emp-004', totId: 'tot-002', allocatedDays: '10.00', usedDays: '1.00', remainingDays: '9.00', year: 2026, status: 'active' },
  { id: 'alloc-021', empId: 'emp-005', totId: 'tot-002', allocatedDays: '10.00', usedDays: '10.00', remainingDays: '0.00', year: 2025, status: 'expired' },
  // alloc-022 has same employee & tot as alloc-003; offset periodYear to 2027 to satisfy (emp, type, year) unique index
  { id: 'alloc-022', empId: 'emp-001', totId: 'tot-003', allocatedDays: '5.00', usedDays: '0.00', remainingDays: '5.00', year: 2027, status: 'active' },
  { id: 'alloc-023', empId: 'emp-002', totId: 'tot-005', allocatedDays: '16.00', usedDays: '0.00', remainingDays: '16.00', year: 2026, status: 'active' },
  { id: 'alloc-024', empId: 'emp-003', totId: 'tot-004', allocatedDays: '90.00', usedDays: '0.00', remainingDays: '90.00', year: 2026, status: 'active' },
  { id: 'alloc-025', empId: 'emp-004', totId: 'tot-003', allocatedDays: '8.00', usedDays: '0.00', remainingDays: '8.00', year: 2026, status: 'revoked' },
];

const allocInsertValues = rawAllocations.map((a) => ({
  companyId,
  employeeId: empMockIdMap[a.empId],
  timeOffTypeId: totMap[a.totId],
  periodYear: a.year,
  entitledDays: a.allocatedDays,
  allocatedDays: a.allocatedDays,
  usedDays: a.usedDays,
  remainingDays: a.remainingDays,
  effectiveFrom: `${a.year}-01-01`,
  effectiveTo: `${a.year}-12-31`,
  status: a.status,
}));

const insertedAllocations = await db.insert(s.allocations).values(allocInsertValues).returning();
const allocMap = Object.fromEntries(
  rawAllocations.map((a, i) => [a.id, insertedAllocations[i].id])
);
console.log(`✓ Seeded ${insertedAllocations.length} time-off allocations`);

// ---------------------------------------------------------------------------
// 12. TIME OFF REQUESTS (from mockTimeOffRequests)
// ---------------------------------------------------------------------------
const rawRequests = [
  { id: 'tor-001', empId: 'emp-001', totId: 'tot-001', allocId: 'alloc-001', start: '2026-09-21', end: '2026-09-23', days: '3.00', status: 'pending', reason: 'Family trip' },
  { id: 'tor-002', empId: 'emp-002', totId: 'tot-002', allocId: 'alloc-005', start: '2026-08-18', end: '2026-08-18', days: '1.00', status: 'approved', reason: 'Medical appointment' },
  { id: 'tor-003', empId: 'emp-003', totId: 'tot-001', allocId: 'alloc-006', start: '2026-08-04', end: '2026-08-08', days: '5.00', status: 'approved', reason: 'Summer vacation' },
  { id: 'tor-004', empId: 'emp-004', totId: 'tot-001', allocId: 'alloc-008', start: '2026-07-11', end: '2026-07-14', days: '4.00', status: 'rejected', reason: 'Blackout period during audit' },
  { id: 'tor-005', empId: 'emp-001', totId: 'tot-002', allocId: 'alloc-002', start: '2026-06-10', end: '2026-06-11', days: '2.00', status: 'approved', reason: 'Flu recovery' },
  { id: 'tor-006', empId: 'emp-001', totId: 'tot-001', allocId: 'alloc-001', start: '2026-05-01', end: '2026-05-04', days: '4.00', status: 'approved', reason: 'Spring break' },
  { id: 'tor-007', empId: 'emp-005', totId: 'tot-001', allocId: 'alloc-009', start: '2026-09-15', end: '2026-09-17', days: '3.00', status: 'pending', reason: 'Personal event' },
  { id: 'tor-008', empId: 'emp-006', totId: 'tot-001', allocId: 'alloc-010', start: '2026-10-01', end: '2026-10-05', days: '5.00', status: 'pending', reason: 'Autumn holiday' },
  { id: 'tor-009', empId: 'emp-002', totId: 'tot-001', allocId: 'alloc-004', start: '2026-07-01', end: '2026-07-10', days: '10.00', status: 'approved', reason: 'European trip' },
  { id: 'tor-010', empId: 'emp-003', totId: 'tot-001', allocId: 'alloc-006', start: '2026-06-01', end: '2026-06-13', days: '13.00', status: 'approved', reason: 'Extended leave' },
  { id: 'tor-011', empId: 'emp-004', totId: 'tot-004', allocId: null, start: '2026-09-28', end: '2026-09-30', days: '3.00', status: 'pending', reason: 'Personal education module' },
  { id: 'tor-012', empId: 'emp-008', totId: 'tot-001', allocId: 'alloc-011', start: '2026-08-01', end: '2026-08-12', days: '12.00', status: 'approved', reason: 'Family event' },
  { id: 'tor-013', empId: 'emp-009', totId: 'tot-001', allocId: 'alloc-012', start: '2026-11-02', end: '2026-11-06', days: '5.00', status: 'pending', reason: 'Late autumn vacation' },
  { id: 'tor-014', empId: 'emp-011', totId: 'tot-001', allocId: 'alloc-013', start: '2026-07-15', end: '2026-07-24', days: '10.00', status: 'approved', reason: 'Rest and relaxation' },
  { id: 'tor-015', empId: 'emp-012', totId: 'tot-001', allocId: 'alloc-014', start: '2026-08-10', end: '2026-08-12', days: '3.00', status: 'approved', reason: 'Short break' },
  { id: 'tor-016', empId: 'emp-013', totId: 'tot-001', allocId: 'alloc-015', start: '2026-06-15', end: '2026-06-29', days: '15.00', status: 'approved', reason: 'Honeymoon' },
  { id: 'tor-017', empId: 'emp-014', totId: 'tot-001', allocId: 'alloc-016', start: '2026-09-08', end: '2026-09-14', days: '7.00', status: 'pending', reason: 'Visiting relatives' },
  { id: 'tor-018', empId: 'emp-015', totId: 'tot-001', allocId: 'alloc-017', start: '2026-05-10', end: '2026-05-13', days: '4.00', status: 'approved', reason: 'Spring trip' },
  { id: 'tor-019', empId: 'emp-016', totId: 'tot-001', allocId: 'alloc-018', start: '2026-08-20', end: '2026-08-21', days: '2.00', status: 'approved', reason: 'Long weekend' },
  { id: 'tor-020', empId: 'emp-001', totId: 'tot-003', allocId: 'alloc-003', start: '2026-04-15', end: '2026-04-15', days: '1.00', status: 'approved', reason: 'Personal errands' },
  { id: 'tor-021', empId: 'emp-002', totId: 'tot-002', allocId: 'alloc-005', start: '2026-09-02', end: '2026-09-03', days: '2.00', status: 'approved', reason: 'Dental surgery' },
  { id: 'tor-022', empId: 'emp-005', totId: 'tot-001', allocId: 'alloc-009', start: '2026-04-01', end: '2026-04-05', days: '5.00', status: 'approved', reason: 'Family gathering' },
  { id: 'tor-023', empId: 'emp-001', totId: 'tot-001', allocId: 'alloc-001', start: '2026-10-10', end: '2026-10-12', days: '3.00', status: 'pending', reason: 'Long weekend getaway' },
  { id: 'tor-024', empId: 'emp-003', totId: 'tot-001', allocId: 'alloc-006', start: '2026-09-18', end: '2026-09-20', days: '3.00', status: 'rejected', reason: 'Project deadline overlap' },
  { id: 'tor-025', empId: 'emp-001', totId: 'tot-004', allocId: null, start: '2026-11-15', end: '2026-11-16', days: '2.00', status: 'cancelled', reason: 'Plans cancelled by employee' },
];

const requestInsertValues = rawRequests.map((r) => ({
  companyId,
  employeeId: empMockIdMap[r.empId],
  timeOffTypeId: totMap[r.totId],
  allocationId: r.allocId ? allocMap[r.allocId] : null,
  startDate: r.start,
  endDate: r.end,
  daysRequested: r.days,
  status: r.status,
  reason: r.reason,
}));

const insertedRequests = await db.insert(s.timeOffRequests).values(requestInsertValues).returning();
console.log(`✓ Seeded ${insertedRequests.length} time-off requests`);

// ---------------------------------------------------------------------------
// 13. ATTENDANCE (112 records from mockAttendance)
// ---------------------------------------------------------------------------
const attendanceEmployeeIds = ['emp-001', 'emp-002', 'emp-003', 'emp-004', 'emp-005', 'emp-006', 'emp-008', 'emp-009', 'emp-011', 'emp-012', 'emp-013', 'emp-014', 'emp-015', 'emp-016'];
const attendanceDates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-08-31', '2026-08-28', '2026-08-27'];

const attendanceValues = [];
for (let index = 0; index < 112; index += 1) {
  const empMockId = attendanceEmployeeIds[index % attendanceEmployeeIds.length];
  const dateStr = attendanceDates[Math.floor(index / attendanceEmployeeIds.length)];
  const variant = index % 11;

  let status = 'present';
  let clockIn = null;
  let clockOut = null;
  let workHours = null;
  let overtimeHours = '0.00';
  let breaks = 60;
  let notes = null;

  if (variant === 2) {
    status = 'absent';
  } else if (variant === 4) {
    status = 'present';
    clockIn = new Date(`${dateStr}T09:11:00Z`);
    notes = 'Missing checkout';
  } else if (variant === 6) {
    status = 'present';
    clockIn = new Date(`${dateStr}T08:48:00Z`);
    clockOut = new Date(`${dateStr}T19:12:00Z`);
    workHours = '9.40';
    overtimeHours = '1.40';
  } else if (variant === 8) {
    status = 'present';
    clockIn = new Date(`${dateStr}T09:27:00Z`);
    clockOut = new Date(`${dateStr}T18:03:00Z`);
    workHours = '8.60';
    notes = 'Corrected from kiosk import';
  } else {
    const isLate = variant === 1 || variant === 9;
    status = isLate ? 'late' : 'present';
    clockIn = new Date(`${dateStr}T${isLate ? '09:18:00' : '08:58:00'}Z`);
    clockOut = new Date(`${dateStr}T${isLate ? '18:06:00' : '17:58:00'}Z`);
    workHours = isLate ? '8.80' : '8.00';
  }

  attendanceValues.push({
    employeeId: empMockIdMap[empMockId],
    workingScheduleId: schedMap['sch-001'],
    attendanceDate: dateStr,
    clockIn,
    clockOut,
    breaksDurationMinutes: breaks,
    workHours,
    overtimeHours,
    status,
    notes,
    source: 'device',
  });
}

const insertedAttendance = await db.insert(s.attendances).values(attendanceValues).returning();
console.log(`✓ Seeded ${insertedAttendance.length} attendance records`);

// ---------------------------------------------------------------------------
// 14. PAYRUNS (from mockPayruns)
// ---------------------------------------------------------------------------
const rawPayruns = [
  { id: 'pr-2026-04', ref: 'PR-2026-04', name: 'April 2026 Regular Payroll', periodStart: '2026-04-01', periodEnd: '2026-04-30', payDate: '2026-04-30', count: 6, gross: '460000.00', ded: '78000.00', net: '382000.00', status: 'paid', paidAt: '2026-04-30T17:00:00Z' },
  { id: 'pr-2026-05', ref: 'PR-2026-05', name: 'May 2026 Regular Payroll', periodStart: '2026-05-01', periodEnd: '2026-05-31', payDate: '2026-05-31', count: 6, gross: '472000.00', ded: '80500.00', net: '391500.00', status: 'paid', paidAt: '2026-05-31T17:00:00Z' },
  { id: 'pr-2026-06', ref: 'PR-2026-06', name: 'June 2026 Regular Payroll', periodStart: '2026-06-01', periodEnd: '2026-06-30', payDate: '2026-06-30', count: 6, gross: '480000.00', ded: '82000.00', net: '398000.00', status: 'paid', paidAt: '2026-06-30T17:00:00Z' },
  { id: 'pr-2026-07', ref: 'PR-2026-07', name: 'July 2026 Regular Payroll', periodStart: '2026-07-01', periodEnd: '2026-07-31', payDate: '2026-07-31', count: 6, gross: '488000.00', ded: '83800.00', net: '404200.00', status: 'paid', paidAt: '2026-07-31T17:00:00Z' },
  { id: 'pr-2026-08', ref: 'PR-2026-08', name: 'August 2026 Regular Payroll', periodStart: '2026-08-01', periodEnd: '2026-08-31', payDate: '2026-08-31', count: 6, gross: '494000.00', ded: '84200.00', net: '409800.00', status: 'paid', paidAt: '2026-08-31T17:00:00Z' },
  { id: 'pr-2026-09', ref: 'PR-2026-09', name: 'September 2026 Regular Payroll', periodStart: '2026-09-01', periodEnd: '2026-09-30', payDate: '2026-09-30', count: 6, gross: '432000.00', ded: '73600.00', net: '358400.00', status: 'processing', paidAt: null },
  { id: 'pr-2026-10', ref: 'PR-2026-10', name: 'October 2026 Executive Payroll', periodStart: '2026-10-01', periodEnd: '2026-10-31', payDate: '2026-10-31', count: 3, gross: '345000.00', ded: '58600.00', net: '286400.00', status: 'approved', paidAt: null },
  { id: 'pr-2026-11', ref: 'PR-2026-11', name: 'November 2026 Regular Cycle', periodStart: '2026-11-01', periodEnd: '2026-11-30', payDate: '2026-11-30', count: 4, gross: '0.00', ded: '0.00', net: '0.00', status: 'draft', paidAt: null },
];

const payrunInsertValues = rawPayruns.map((p) => ({
  companyId,
  name: p.name,
  payPeriodStart: p.periodStart,
  payPeriodEnd: p.periodEnd,
  paymentDate: p.payDate,
  payFrequency: 'monthly',
  currency: 'INR',
  grossTotal: p.gross,
  deductionTotal: p.ded,
  netTotal: p.net,
  employeeCount: p.count,
  status: p.status,
  paidAt: p.paidAt ? new Date(p.paidAt) : null,
}));

const insertedPayruns = await db.insert(s.payruns).values(payrunInsertValues).returning();
const payrunMap = Object.fromEntries(
  rawPayruns.map((p, i) => [p.id, insertedPayruns[i].id])
);
console.log(`✓ Seeded ${insertedPayruns.length} payruns`);

// ---------------------------------------------------------------------------
// 15. PAYSLIPS & PAYSLIP LINES (from mockPayslips)
// ---------------------------------------------------------------------------
const rawPayslips = [
  // April 2026
  { payrunId: 'pr-2026-04', empId: 'emp-001', conId: 'con-013', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-04-30T17:00:00Z' },
  { payrunId: 'pr-2026-04', empId: 'emp-002', conId: 'con-001', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-04-30T17:00:00Z' },
  { payrunId: 'pr-2026-04', empId: 'emp-003', conId: 'con-002', structId: 'ss-001', gross: '71000.00', ded: '13900.00', tax: '7100.00', net: '57100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-04-30T17:00:00Z' },
  { payrunId: 'pr-2026-04', empId: 'emp-005', conId: 'con-005', structId: 'ss-001', gross: '65000.00', ded: '12700.00', tax: '6500.00', net: '52300.00', status: 'paid', paidDays: '22.00', paidAt: '2026-04-30T17:00:00Z' },
  { payrunId: 'pr-2026-04', empId: 'emp-006', conId: 'con-006', structId: 'ss-001', gross: '110000.00', ded: '21200.00', tax: '11000.00', net: '88800.00', status: 'paid', paidDays: '22.00', paidAt: '2026-04-30T17:00:00Z' },
  { payrunId: 'pr-2026-04', empId: 'emp-009', conId: 'con-009', structId: 'ss-001', gross: '60000.00', ded: '10400.00', tax: '6000.00', net: '49600.00', status: 'paid', paidDays: '22.00', paidAt: '2026-04-30T17:00:00Z' },

  // May 2026
  { payrunId: 'pr-2026-05', empId: 'emp-001', conId: 'con-013', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-05-31T17:00:00Z' },
  { payrunId: 'pr-2026-05', empId: 'emp-002', conId: 'con-001', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-05-31T17:00:00Z' },
  { payrunId: 'pr-2026-05', empId: 'emp-003', conId: 'con-002', structId: 'ss-001', gross: '71000.00', ded: '13900.00', tax: '7100.00', net: '57100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-05-31T17:00:00Z' },
  { payrunId: 'pr-2026-05', empId: 'emp-005', conId: 'con-005', structId: 'ss-001', gross: '65000.00', ded: '12700.00', tax: '6500.00', net: '52300.00', status: 'paid', paidDays: '22.00', paidAt: '2026-05-31T17:00:00Z' },
  { payrunId: 'pr-2026-05', empId: 'emp-006', conId: 'con-006', structId: 'ss-001', gross: '114000.00', ded: '22300.00', tax: '11400.00', net: '91700.00', status: 'paid', paidDays: '22.00', paidAt: '2026-05-31T17:00:00Z' },
  { payrunId: 'pr-2026-05', empId: 'emp-009', conId: 'con-009', structId: 'ss-001', gross: '68000.00', ded: '11800.00', tax: '6800.00', net: '56200.00', status: 'paid', paidDays: '22.00', paidAt: '2026-05-31T17:00:00Z' },

  // June 2026
  { payrunId: 'pr-2026-06', empId: 'emp-001', conId: 'con-013', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-06-30T17:00:00Z' },
  { payrunId: 'pr-2026-06', empId: 'emp-002', conId: 'con-001', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-06-30T17:00:00Z' },
  { payrunId: 'pr-2026-06', empId: 'emp-003', conId: 'con-002', structId: 'ss-001', gross: '71000.00', ded: '13900.00', tax: '7100.00', net: '57100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-06-30T17:00:00Z' },
  { payrunId: 'pr-2026-06', empId: 'emp-005', conId: 'con-005', structId: 'ss-001', gross: '65000.00', ded: '12700.00', tax: '6500.00', net: '52300.00', status: 'paid', paidDays: '22.00', paidAt: '2026-06-30T17:00:00Z' },
  { payrunId: 'pr-2026-06', empId: 'emp-006', conId: 'con-006', structId: 'ss-001', gross: '117000.00', ded: '22800.00', tax: '11700.00', net: '94200.00', status: 'paid', paidDays: '22.00', paidAt: '2026-06-30T17:00:00Z' },
  { payrunId: 'pr-2026-06', empId: 'emp-009', conId: 'con-009', structId: 'ss-001', gross: '73000.00', ded: '12800.00', tax: '7300.00', net: '60200.00', status: 'paid', paidDays: '22.00', paidAt: '2026-06-30T17:00:00Z' },

  // July 2026
  { payrunId: 'pr-2026-07', empId: 'emp-001', conId: 'con-013', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-07-31T17:00:00Z' },
  { payrunId: 'pr-2026-07', empId: 'emp-002', conId: 'con-001', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-07-31T17:00:00Z' },
  { payrunId: 'pr-2026-07', empId: 'emp-003', conId: 'con-002', structId: 'ss-001', gross: '71000.00', ded: '13900.00', tax: '7100.00', net: '57100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-07-31T17:00:00Z' },
  { payrunId: 'pr-2026-07', empId: 'emp-005', conId: 'con-005', structId: 'ss-001', gross: '65000.00', ded: '12700.00', tax: '6500.00', net: '52300.00', status: 'paid', paidDays: '22.00', paidAt: '2026-07-31T17:00:00Z' },
  { payrunId: 'pr-2026-07', empId: 'emp-006', conId: 'con-006', structId: 'ss-001', gross: '120000.00', ded: '23600.00', tax: '12000.00', net: '96400.00', status: 'paid', paidDays: '22.00', paidAt: '2026-07-31T17:00:00Z' },
  { payrunId: 'pr-2026-07', empId: 'emp-009', conId: 'con-009', structId: 'ss-001', gross: '78000.00', ded: '13800.00', tax: '7800.00', net: '64200.00', status: 'paid', paidDays: '22.00', paidAt: '2026-07-31T17:00:00Z' },

  // August 2026
  { payrunId: 'pr-2026-08', empId: 'emp-001', conId: 'con-013', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-08-31T17:00:00Z' },
  { payrunId: 'pr-2026-08', empId: 'emp-002', conId: 'con-001', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '22.00', paidAt: '2026-08-31T17:00:00Z' },
  { payrunId: 'pr-2026-08', empId: 'emp-003', conId: 'con-002', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'paid', paidDays: '21.00', paidAt: '2026-08-31T17:00:00Z' },
  { payrunId: 'pr-2026-08', empId: 'emp-005', conId: 'con-005', structId: 'ss-001', gross: '65000.00', ded: '12700.00', tax: '6500.00', net: '52300.00', status: 'paid', paidDays: '22.00', paidAt: '2026-08-31T17:00:00Z' },
  { payrunId: 'pr-2026-08', empId: 'emp-006', conId: 'con-006', structId: 'ss-001', gross: '120000.00', ded: '23600.00', tax: '12000.00', net: '96400.00', status: 'paid', paidDays: '22.00', paidAt: '2026-08-31T17:00:00Z' },
  { payrunId: 'pr-2026-08', empId: 'emp-009', conId: 'con-009', structId: 'ss-001', gross: '78000.00', ded: '13800.00', tax: '7800.00', net: '64200.00', status: 'paid', paidDays: '22.00', paidAt: '2026-08-31T17:00:00Z' },

  // September 2026
  { payrunId: 'pr-2026-09', empId: 'emp-001', conId: 'con-013', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'processing', paidDays: '22.00', paidAt: null },
  { payrunId: 'pr-2026-09', empId: 'emp-002', conId: 'con-001', structId: 'ss-001', gross: '77000.00', ded: '14900.00', tax: '7700.00', net: '62100.00', status: 'processing', paidDays: '22.00', paidAt: null },
  { payrunId: 'pr-2026-09', empId: 'emp-003', conId: 'con-002', structId: 'ss-001', gross: '71000.00', ded: '13900.00', tax: '7100.00', net: '57100.00', status: 'processing', paidDays: '22.00', paidAt: null },
  { payrunId: 'pr-2026-09', empId: 'emp-005', conId: 'con-005', structId: 'ss-001', gross: '65000.00', ded: '12700.00', tax: '6500.00', net: '52300.00', status: 'processing', paidDays: '22.00', paidAt: null },
  { payrunId: 'pr-2026-09', empId: 'emp-008', conId: 'con-008', structId: 'ss-003', gross: '33000.00', ded: '3500.00', tax: '3300.00', net: '29500.00', status: 'processing', paidDays: '22.00', paidAt: null },
  { payrunId: 'pr-2026-09', empId: 'emp-009', conId: 'con-009', structId: 'ss-001', gross: '78000.00', ded: '13800.00', tax: '7800.00', net: '64200.00', status: 'processing', paidDays: '22.00', paidAt: null },

  // October 2026 (Executive Payroll)
  { payrunId: 'pr-2026-10', empId: 'emp-006', conId: 'con-006', structId: 'ss-002', gross: '120000.00', ded: '21000.00', tax: '12000.00', net: '99000.00', status: 'approved', paidDays: '22.00', paidAt: null },
  { payrunId: 'pr-2026-10', empId: 'emp-010', conId: 'con-010', structId: 'ss-002', gross: '130000.00', ded: '22000.00', tax: '13000.00', net: '108000.00', status: 'approved', paidDays: '22.00', paidAt: null },
  { payrunId: 'pr-2026-10', empId: 'emp-014', conId: 'con-015', structId: 'ss-002', gross: '95000.00', ded: '12000.00', tax: '9500.00', net: '83000.00', status: 'approved', paidDays: '22.00', paidAt: null },
];

const payslipValues = rawPayslips.map((p) => ({
  payrunId: payrunMap[p.payrunId],
  employeeId: empMockIdMap[p.empId],
  contractId: contractMap[p.conId],
  salaryStructureId: structMap[p.structId],
  grossAmount: p.gross,
  deductionAmount: p.ded,
  taxAmount: p.tax,
  netAmount: p.net,
  paidDays: p.paidDays,
  paymentMethod: 'bank_transfer',
  status: p.status,
  paidAt: p.paidAt ? new Date(p.paidAt) : null,
}));

const insertedPayslips = await db.insert(s.payslips).values(payslipValues).returning();

// Insert payslip lines for each payslip
const payslipLineValues = [];
for (const ps of insertedPayslips) {
  payslipLineValues.push(
    { payslipId: ps.id, name: 'Basic Salary', type: 'earning', calculationType: 'fixed', amount: '60000.00', sortOrder: 10 },
    { payslipId: ps.id, name: 'Housing Allowance', type: 'earning', calculationType: 'percentage', amount: '12000.00', sortOrder: 20 },
    { payslipId: ps.id, name: 'Transport Allowance', type: 'earning', calculationType: 'fixed', amount: '5000.00', sortOrder: 30 },
    { payslipId: ps.id, name: 'Provident Fund', type: 'deduction', calculationType: 'percentage', amount: '7200.00', sortOrder: 60 },
    { payslipId: ps.id, name: 'Income Tax (TDS)', type: 'deduction', calculationType: 'percentage', amount: ps.taxAmount || '7700.00', sortOrder: 70 },
  );
}

await db.insert(s.payslipLines).values(payslipLineValues);
console.log(`✓ Seeded ${insertedPayslips.length} payslips with ${payslipLineValues.length} line items`);

// ---------------------------------------------------------------------------
// SUMMARY & VERIFICATION
// ---------------------------------------------------------------------------
const count = async (t) => (await db.select({ n: sql`count(*)::int` }).from(t))[0].n;
console.log('\n======================================================');
console.log(' DATABASE SEED SUMMARY (Northstar Technologies)');
console.log('======================================================');
console.log(`Companies:         ${await count(s.companies)}`);
console.log(`Roles:             ${await count(s.roles)}`);
console.log(`Users:             ${await count(s.users)}`);
console.log(`Departments:       ${await count(s.departments)}`);
console.log(`Job Positions:     ${await count(s.jobPositions)}`);
console.log(`Working Schedules: ${await count(s.workingSchedules)}`);
console.log(`Salary Structures: ${await count(s.salaryStructures)}`);
console.log(`Salary Rules:      ${await count(s.salaryRules)}`);
console.log(`Employees:         ${await count(s.employees)}`);
console.log(`Contracts:         ${await count(s.contracts)}`);
console.log(`Time Off Types:    ${await count(s.timeOffTypes)}`);
console.log(`Allocations:       ${await count(s.allocations)}`);
console.log(`Time Off Requests: ${await count(s.timeOffRequests)}`);
console.log(`Attendances:       ${await count(s.attendances)}`);
console.log(`Payruns:           ${await count(s.payruns)}`);
console.log(`Payslips:          ${await count(s.payslips)}`);
console.log(`Payslip Lines:     ${await count(s.payslipLines)}`);
console.log('======================================================');

const sampleEmployee = await db.query.employees.findFirst({
  where: eq(s.employees.employeeCode, 'EMP-001'),
  with: {
    user: true,
    department: true,
    jobPosition: true,
    contracts: true,
    attendances: true,
    timeOffRequests: true,
  },
});

console.log(`\nRelational test: ${sampleEmployee.firstName} ${sampleEmployee.lastName} (${sampleEmployee.employeeCode})`);
console.log(`- Email / User: ${sampleEmployee.email} (user_id: ${sampleEmployee.userId})`);
console.log(`- Department:   ${sampleEmployee.department?.name}`);
console.log(`- Job Position: ${sampleEmployee.jobPosition?.title}`);
console.log(`- Contracts:    ${sampleEmployee.contracts.length}`);
console.log(`- Attendances:  ${sampleEmployee.attendances.length}`);
console.log(`- Time-off:     ${sampleEmployee.timeOffRequests.length}`);
console.log('\n✅ Northstar Technologies dataset successfully seeded into PostgreSQL!');

await client.end();
