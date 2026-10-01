# ✅ Project Tasks

## PeoplePay360 – Task Breakdown & Development Plan

This document contains the complete list of tasks for building the PeoplePay360 application. Tasks are divided into phases with clear deliverables, priorities, and status tracking.

| 📚 **Total Tasks** | ✅ **Completed** | 🔄 **In Progress** | ⬜ **Not Started** |
| :---: | :---: | :---: | :---: |
| **68** | **65** | **2** | **1** |
| ▓▓▓▓▓▓▓▓▓░ 100% | ▓▓▓▓▓▓▓▓▓░ 96% | ▓░░░░░░░░░ 3% | ▓░░░░░░░░░ 1% |

---

## 🚀 Phase 1: Project Setup

Set up the development environment, repository, and core configuration.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Initialize Next.js project | 🔴 High | ✅ Completed | App Router, Webpack dev/build scripts |
| 1.2 | Configure Tailwind CSS | 🔴 High | ✅ Completed | Tailwind v4 with PostCSS pipeline |
| 1.3 | Set up Git repository | 🔴 High | ✅ Completed | GitHub remote, `main` branch |
| 1.4 | Create Midnight design tokens | 🟡 Medium | ✅ Completed | CSS custom properties in `globals.css` |
| 1.5 | Build shadcn/ui-compatible primitives | 🟡 Medium | ✅ Completed | Buttons, inputs, tables, dialogs |
| 1.6 | Configure ESLint and Prettier | 🟡 Medium | 🔄 In Progress | `next lint` removed in installed Next.js — needs new config |

## 🔐 Phase 2: Authentication & RBAC

Implement user authentication, sessions, and role-based access control.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 2.1 | Design auth data model & dev accounts | 🔴 High | ✅ Completed | Mock auth users with 5 roles |
| 2.2 | Implement login page | 🔴 High | ✅ Completed | `/login` with validation |
| 2.3 | Implement JWT session storage | 🔴 High | ✅ Completed | jose tokens, secure client storage |
| 2.4 | Protect dashboard routes | 🔴 High | ✅ Completed | `ProtectedRoute` + `/unauthorized` |
| 2.5 | Define roles & permission matrix | 🔴 High | ✅ Completed | 5 canonical roles in `permissions.ts` |
| 2.6 | Build role-aware navigation | 🟡 Medium | ✅ Completed | Sidebar filtered by permissions |
| 2.7 | Add action-level permission gates | 🟡 Medium | ✅ Completed | `PermissionGate` / `RoleGate` |

## 👥 Phase 3: HR Master Data

Employees, contracts, schedules, and attendance management.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 3.1 | Employees list & kanban views | 🔴 High | ✅ Completed | Search, status, department filters |
| 3.2 | Employee CRUD flows | 🔴 High | ✅ Completed | Create, edit, detail, delete |
| 3.3 | Employee hub smart links | 🟡 Medium | ✅ Completed | Contracts, attendance, time-off, allocations |
| 3.4 | Contracts CRUD + validation | 🔴 High | ✅ Completed | Period/status validation, active highlighting |
| 3.5 | Schedules CRUD + detail views | 🔴 High | ✅ Completed | Types, timezone, weekly hours |
| 3.6 | Attendance list & manual-edit indicators | 🔴 High | ✅ Completed | Check-in/out, worked minutes, notes |
| 3.7 | Missing-checkout state handling | 🟡 Medium | ✅ Completed | Never fabricate checkout values |
| 3.8 | Attendance overview & reporting | 🟡 Medium | ✅ Completed | Health metrics |

## 🌴 Phase 4: Time Off

Leave types, allocations, requests, approvals, and balances.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 4.1 | Time-off type configuration | 🟡 Medium | ✅ Completed | Type CRUD |
| 4.2 | Allocation CRUD + validity windows | 🔴 High | ✅ Completed | Lifecycle states |
| 4.3 | Request CRUD + duration calculation | 🔴 High | ✅ Completed | Days and hours |
| 4.4 | Approval & refusal flows | 🔴 High | ✅ Completed | Confirmation dialogs |
| 4.5 | Approved-only usable balance | 🔴 High | ✅ Completed | Refused records never expose balance |
| 4.6 | Duplicate approval protection | 🟡 Medium | ✅ Completed | Idempotent approvals |
| 4.7 | Balance restore on approved-request deletion | 🟡 Medium | ✅ Completed | Mock mode |

## 💰 Phase 5: Compensation

Salary structures, rules, and the safe calculation engine.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 5.1 | Salary structure CRUD | 🔴 High | ✅ Completed | Structure-to-rule links |
| 5.2 | Salary rule CRUD | 🔴 High | ✅ Completed | `BASIC/ALLOWANCE/GROSS/DEDUCTION/NET` |
| 5.3 | Deterministic rule sequencing | 🔴 High | ✅ Completed | Dependency + cycle validation |
| 5.4 | Safe formula engine (no `eval`) | 🔴 High | ✅ Completed | Fixed / percentage / formula types |
| 5.5 | Live salary calculation preview | 🟡 Medium | ✅ Completed | Structure + calculate endpoint |
| 5.6 | Deletion protection for referenced records | 🟡 Medium | ✅ Completed | Structures and rules in use |

## 🧾 Phase 6: Payroll & Payslips

The payrun workflow from draft to payslip delivery.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 6.1 | Payrun creation wizard | 🔴 High | ✅ Completed | Period + structure selection |
| 6.2 | Employee selection + contract resolution | 🔴 High | ✅ Completed | Applicable contract per period |
| 6.3 | Attendance-based worked-day calculation | 🔴 High | ✅ Completed | Real attendance records |
| 6.4 | Payslip generation + duplicate warnings | 🔴 High | ✅ Completed | Duplicate detection |
| 6.5 | Blocking validation errors + mark paid | 🔴 High | ✅ Completed | `DRAFT → COMPUTED → VALIDATED → PAID` |
| 6.6 | Printable payslip layout + print styles | 🟡 Medium | ✅ Completed | Print hides nav/controls |
| 6.7 | PDF service boundary | 🔴 High | ✅ Completed | `GET /payslips/:id/pdf` |
| 6.8 | Payslip delivery service + statuses | 🔴 High | ✅ Completed | Send only after `PAID` |
| 6.9 | Delivery summary with success/failure | 🟡 Medium | ✅ Completed | Per-employee results |

## 📊 Phase 7: Dashboard & Reports

Role-aware dashboards and dynamic reporting.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 7.1 | Role-aware dashboard workspaces | 🔴 High | ✅ Completed | Company + personal employee views |
| 7.2 | Payroll KPIs + salary trend charts | 🔴 High | ✅ Completed | Recharts, derived from live records |
| 7.3 | Attendance & time-off overviews | 🟡 Medium | ✅ Completed | Overview widgets |
| 7.4 | Department breakdown + salary cost | 🟡 Medium | ✅ Completed | Filters applied across widgets |
| 7.5 | Reports (payroll, department, attendance, time-off) | 🔴 High | ✅ Completed | Dynamic views |
| 7.6 | Filters, search & CSV export | 🟡 Medium | ✅ Completed | Current-record calculations |

## ⚙️ Phase 8: Administration

Users, roles, permissions, and organization settings.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 8.1 | User management (list/create/detail/edit) | 🔴 High | ✅ Completed | Status + role assignment |
| 8.2 | Employee association for users | 🟡 Medium | ✅ Completed | Self-scoping for `EMPLOYEE` |
| 8.3 | Roles list + permission matrix | 🟡 Medium | ✅ Completed | By module and action |
| 8.4 | Organization settings (general/regional) | 🟡 Medium | ✅ Completed | Settings pages |
| 8.5 | Payroll, security & notification settings | 🟡 Medium | ✅ Completed | Settings groups |

## 🗄️ Phase 9: Backend & Database

PostgreSQL persistence, API routes, and server workflows.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 9.1 | Drizzle schema + PostgreSQL connection | 🔴 High | ✅ Completed | `src/server/schema.js`, `db.js` |
| 9.2 | Migration + seed pipeline | 🔴 High | ✅ Completed | `db:migrate`, `db:seed`, prod variants |
| 9.3 | Auth API (register/login/me/logout) | 🔴 High | ✅ Completed | bcrypt hashing, JWT cookies |
| 9.4 | Resource API routes | 🔴 High | ✅ Completed | Employees, contracts, schedules, time-off, users... |
| 9.5 | Server payrun processor | 🔴 High | ✅ Completed | Computation + warnings server-side |
| 9.6 | Server salary calculator | 🔴 High | ✅ Completed | Mirrors client engine |
| 9.7 | Payslip PDF service (PDFKit) | 🟡 Medium | ✅ Completed | Server-generated PDFs |
| 9.8 | Payslip email delivery (Nodemailer) | 🟡 Medium | ✅ Completed | Delivery statuses |

## 🏁 Phase 10: Quality & Deployment

Validation, audits, tests, and production deployment.

| # | Task | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 10.1 | Typecheck + production build green | 🔴 High | ✅ Completed | `tsc --noEmit`, Webpack build |
| 10.2 | Mock/API dual data-mode audit | 🔴 High | ✅ Completed | No mode branching in UI |
| 10.3 | Loading/empty/error state audit | 🟡 Medium | ✅ Completed | Consistent states everywhere |
| 10.4 | Vercel deployment + prod env pipeline | 🔴 High | ✅ Completed | `.env.production`, `db:setup:prod` |
| 10.5 | Browser smoke tests (Playwright) | 🟡 Medium | 🔄 In Progress | Needs local browser runtime |
| 10.6 | Automated test suite | 🟡 Medium | ⬜ Not Started | Next up |
