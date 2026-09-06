# PeoplePay360

PeoplePay360 is a full HR and payroll operations workspace for managing employees, contracts, schedules, attendance, time off, compensation configuration, payroll processing, payslips, reports, and administration.

It is implemented as a responsive Next.js App Router application with a PeoplePay360 Midnight enterprise interface. The frontend is designed around replaceable data services so mock mode can support demos while API mode can connect to a backend without rewriting page components.

## Project Status

The planned frontend sprints are complete through Sprint 10:

- HR master data: employees, contracts, schedules, and attendance
- Time off: types, allocations, requests, approval, refusal, and balance consumption
- Compensation: salary structures, salary rules, safe calculations, and previews
- Payroll: payrun creation, employee selection, computation, warnings, validation, payment, and delivery
- Payslips: list, detail, salary breakdown, printable layout, PDF service boundary, and delivery state
- Analytics: dynamic payroll, attendance, time-off, and department reports
- Administration: users, roles, permissions, settings, and RBAC-aware navigation
- Final integration review: loading, empty, error, mock/API, data relationship, and workflow audits

The application is frontend-complete for the current scope. Backend authorization, persistence, email delivery, and server-generated PDF rendering must be supplied by the production backend.

## Technology Stack

### Application

- Next.js 16 App Router
- React
- TypeScript
- Tailwind CSS v4
- Webpack development and production builds
- `next/font` and local design tokens

### UI and interaction

- shadcn/ui-compatible local primitives
- Lucide React icons
- Recharts for dashboard and report charts
- Responsive CSS layouts for desktop, tablet, and mobile
- PeoplePay360 Midnight design tokens for backgrounds, surfaces, borders, text, primary actions, success, warning, and danger states

### Data and forms

- TanStack React Query for queries, mutations, cache invalidation, and loading states
- React Hook Form for form state
- Zod for form validation
- Centralized TypeScript domain models
- Service abstraction supporting mock and API implementations

### Development tools

- Node.js and npm
- TypeScript compiler
- Next.js production build
- Playwright-compatible browser testing when a local browser runtime is available

## Requirements

- Node.js compatible with the installed Next.js version
- npm
- Optional: a backend API for API mode
- Optional: Google Chrome, Microsoft Edge, or Playwright Chromium for browser testing

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development server uses Webpack through the project scripts. The local environment may warn that the native Windows SWC binary cannot be loaded; Next.js falls back to WASM/Webpack compilation and the application still builds successfully.

## Environment Configuration

The default `.env.local` configuration uses the in-memory mock data source:

```env
NEXT_PUBLIC_DATA_MODE=mock
```

For a backend-connected environment:

```env
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

The API client defaults to `http://localhost:8000/api` when `NEXT_PUBLIC_API_BASE_URL` is not set.

### Data flow

```text
Page or component
	-> TanStack Query hook
	-> domain service
	-> mock store or API client
```

Pages and components should use hooks and services rather than importing raw mock records. Mock records are isolated under `src/data/mock`; service and workflow boundaries live under `src/lib/services`.

## Product Modules

### Dashboard

`/dashboard` provides role-aware workspaces:

- Company dashboard for HR and payroll roles
- Personal employee workspace for `EMPLOYEE`
- Payroll KPIs and net salary totals
- Payslip generation metrics
- Average salary
- Approved time off
- Attendance health
- Salary cost by department
- Monthly salary trend
- Payroll warnings and operational alerts
- Attendance overview
- Time-off overview
- Department breakdown

Dashboard values are derived from current service records rather than random or static display values. Period, department, and employee-type filters are applied across the dashboard widgets.

### Employees and contracts

- Employee list and kanban views
- Search, status, department, and employee-type filters
- Employee create, edit, detail, and delete flows
- Employee hub smart links to contracts, attendance, time off, and allocations
- Dynamic related-record counts
- Active contract highlighting
- Historical contract access
- Contract period and status validation
- Salary structure links from contracts

### Working schedules and attendance

- Schedule CRUD and detail views
- Schedule types, status, timezone, weekly hours, and working days
- Employee schedule relationships
- Attendance list, create, edit, and detail views
- Check-in, check-out, worked minutes, status, notes, and manual-edit indicators
- Missing checkout state without fabricated checkout values
- Attendance overview and reporting

### Time off

- Time-off type configuration
- Allocation CRUD and employee-scoped views
- Request CRUD and employee-scoped views
- Duration calculation for days and hours
- Allocation validity windows
- Allocation lifecycle: `PENDING`, `APPROVED`, `REFUSED`, `ACTIVE`, and `EXPIRED` where applicable
- Approval and refusal confirmation flows
- Approved-only usable balance
- Request approval consumes approved allocation balance
- Refused requests and refused allocations do not consume or expose usable balance
- Duplicate approval protection
- Approved request deletion restores consumed balance in mock mode

### Salary structures and rules

- Salary structure CRUD
- Salary rule CRUD
- Rule categories: `BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, and `NET`
- Computation types: `FIXED`, `PERCENTAGE`, and `FORMULA`
- Deterministic rule sequencing
- Dependency and cycle validation
- Safe arithmetic formula parsing without `eval` or `new Function`
- Live salary calculation preview
- Structure-to-rule and contract-to-structure relationships
- Deletion protection for referenced structures and rules
- Read-only salary access for `HR_PAYROLL_USER`

### Payroll and payslips

Payrun workflow:

```text
DRAFT
	-> COMPUTED
	-> VALIDATED
	-> PAID
	-> payslip delivery
```

Payrun features include:

- Payrun creation wizard
- Period and salary structure selection
- Employee selection
- Applicable contract resolution for the payroll period
- Attendance-based worked-day calculation
- Salary structure and rule calculation
- Payslip generation
- Duplicate payslip warnings
- Missing contract and invalid-period warnings
- Missing bank detail warnings
- Blocking validation errors
- Mark paid confirmation
- Delivery summary with success and failure results

Payslips include:

- Employee
- Pay period
- Contract
- Salary structure
- Payrun reference
- Worked days
- Basic salary
- Allowances
- Gross salary
- Deductions
- Net salary
- Rule-level calculation lines
- Financial status
- Separate delivery status

### PDF behavior

The UI calls the service boundary:

```ts
payslipService.generatePdf(payslipId)
```

In API mode, the service requests:

```text
GET /payslips/:id/pdf
```

The returned PDF blob opens in a new browser tab. In mock mode, the service validates that the payslip exists and returns an explicit browser-print fallback. The payslip page then calls `window.print()` so the user can export the print layout to PDF.

The printable layout includes PeoplePay360 branding, employee information, pay period, contract, salary structure, earnings, deductions, gross, and net values. Navigation and interactive controls are hidden by print styles.

### Payslip delivery

The UI calls the service boundary:

```ts
payrunService.sendPayslips(payrunId)
```

In API mode, the service requests:

```text
POST /payruns/:id/send-payslips
```

In mock mode, delivery is explicitly simulated. Valid employee email addresses are counted as successful. Missing or invalid email addresses are reported as failures and do not receive a sent state.

Delivery status is separate from the financial payslip status:

- Financial status: `DRAFT`, `COMPUTED`, `VALIDATED`, `PAID`, or `DUPLICATE_WARNING`
- Delivery status: `PENDING`, `SENT`, or `FAILED`

Payslips can only be sent after the payrun is marked `PAID`.

### Reports

`/reports` contains dynamic reporting views for:

- Payroll summary
- Department salary analysis
- Attendance analysis
- Time-off analysis

Reports support filters, search, current-record calculations, and CSV export where available.

### Administration

Admin surfaces include:

- User list, create, detail, and edit
- Employee association for users
- Role assignment
- User status
- Role list and role details
- Permission matrix by module and action
- Mock-mode permission updates
- Organization settings
- General and regional settings
- Payroll and security settings
- Notification settings

## Routes

### Authentication and shared

- `/login`
- `/unauthorized`

### Dashboard and workforce

- `/dashboard`
- `/employees`
- `/employees/new`
- `/employees/[id]`
- `/employees/[id]/edit`
- `/employees/[id]/contracts`
- `/employees/[id]/attendance`
- `/employees/[id]/time-off`
- `/employees/[id]/allocations`
- `/contracts`
- `/contracts/new`
- `/contracts/[id]`
- `/contracts/[id]/edit`
- `/schedules`
- `/schedules/new`
- `/schedules/[id]`
- `/schedules/[id]/edit`
- `/attendance`
- `/attendance/new`
- `/attendance/[id]`
- `/attendance/[id]/edit`

### Time off

- `/time-off`
- `/time-off/types`
- `/time-off/types/new`
- `/time-off/types/[id]`
- `/time-off/types/[id]/edit`
- `/time-off/allocations`
- `/time-off/allocations/new`
- `/time-off/allocations/[id]`
- `/time-off/allocations/[id]/edit`
- `/time-off/requests`
- `/time-off/requests/new`
- `/time-off/requests/[id]`
- `/time-off/requests/[id]/edit`

### Payroll and analytics

- `/salary-structures`
- `/salary-structures/new`
- `/salary-structures/[id]`
- `/salary-structures/[id]/edit`
- `/salary-rules`
- `/salary-rules/new`
- `/salary-rules/[id]`
- `/salary-rules/[id]/edit`
- `/payroll`
- `/payroll/new`
- `/payroll/[id]`
- `/payslips`
- `/payslips/[id]`
- `/reports`

### Administration

- `/users`
- `/users/new`
- `/users/[id]`
- `/users/[id]/edit`
- `/roles`
- `/roles/[id]`
- `/settings`

## Architecture and Repository Layout

```text
src/
	app/
		(auth)/                 Authentication routes
		(dashboard)/            Protected product routes
		globals.css             Theme tokens and print styles
		layout.tsx              Root layout
	components/
		auth/                   Protected routes and permission gates
		dashboard/              Dashboard charts and operational widgets
		layout/                 App shell, sidebar, header, breadcrumbs
		payroll/                Payrun, payslip, and delivery UI
		shared/                 Tables, states, headers, metrics, buttons
		time-off/               Allocation, request, and balance UI
		ui/                     Reusable local UI primitives
		users/                  User management forms
	data/mock/                Mock domain records and development accounts
	hooks/                    TanStack Query and permission hooks
	lib/
		api/                    Backend API client boundary
		auth/                   Auth service, storage, and types
		services/               Resource services and business workflows
		salary-calculator.ts    Safe salary calculation engine
		time-off-utils.ts       Allocation availability and duration rules
		permissions.ts          Roles, permissions, route access, navigation
	types/
		domain.ts               Shared domain models
```

## RBAC

The canonical roles are:

| Role | Access summary |
| --- | --- |
| `EMPLOYEE` | Own employee information, attendance, time off, balances, and payslips where supported |
| `HR_MANAGER` | Employees, contracts, schedules, attendance, time off, allocations, and approvals |
| `HR_PAYROLL_USER` | HR access plus payroll and read-only salary configuration |
| `HR_PAYROLL_MANAGER` | HR access plus full payroll processing and salary configuration |
| `ADMIN` | Full product access, users, roles, permissions, and settings |

RBAC is implemented through:

- `src/lib/permissions.ts`
- `ProtectedRoute`
- `PermissionGate`
- `RoleGate`
- Role-aware navigation
- Action-level permission checks
- Employee self-scoping for personal records

This is frontend RBAC for UX and development mode. Backend authorization remains the production security boundary.

## Development Accounts

All mock development accounts use the password:

```text
peoplepay
```

| Email | Role |
| --- | --- |
| `rahul.sharma@northstar.io` | `EMPLOYEE` |
| `priya.shah@northstar.io` | `HR_MANAGER` |
| `amit.patel@northstar.io` | `HR_PAYROLL_USER` |
| `neha.jain@northstar.io` | `HR_PAYROLL_MANAGER` |
| `arjun.mehta@northstar.io` | `ADMIN` |

These are development credentials only. Do not use them in a production deployment.

## Scripts

```bash
npm run dev       # Start the Webpack development server
npm run typecheck # Run TypeScript without emitting files
npm run build     # Create the production build with Webpack
npm run start     # Start the production server after building
npm run lint      # Legacy script; see limitations below
```

## Validation and Quality Checks

Recommended validation sequence:

```bash
npm install
npm run typecheck
npm run build
npm run start
```

The application has also been smoke-tested through the live development server for key routes such as `/login`, `/dashboard`, and `/payslips`.

For browser verification with an installed Chrome executable, Playwright can be used without adding it to the project manifest:

```bash
npm install --no-save --package-lock=false playwright
```

Then configure the runner to use the installed Chrome or Edge executable.

## Known Limitations

- No backend service is included in this repository.
- API mode requires a compatible backend implementing the documented service paths.
- Mock mutations are in-memory and reset when the browser session or module process restarts.
- Mock PDF generation uses browser print-to-PDF and is not equivalent to server-generated PDF output.
- Mock delivery is simulated and does not send real email.
- The `npm run lint` script currently points to the removed/deprecated `next lint` command in the installed Next.js version. A future maintenance change should add an ESLint configuration and update the script to the supported Next.js lint workflow.
- Native Windows SWC may be unavailable in some environments; the configured Webpack scripts use the fallback compiler successfully.
- Full production backend authorization, persistence, email delivery, and PDF generation must be implemented server-side.

## Demo Flow

### Payroll and payslip flow

```text
Login as Admin
	-> Dashboard
	-> Employees
	-> Employee detail
	-> Contract and Schedule
	-> Attendance and Time Off
	-> Salary Structure and Salary Rules
	-> Payrun
	-> Select employees
	-> Compute
	-> Review warnings
	-> Validate
	-> Mark Paid
	-> Open Payslip
	-> Generate PDF
	-> Send Payslips
	-> Return to Dashboard
```

### Time-off approval flow

```text
Employee or HR user
	-> Employee balance
	-> Pending allocation
	-> HR Manager or Admin approves allocation
	-> Approved balance becomes usable
	-> Employee submits request
	-> Authorized role approves request
	-> Allocation used balance increases
	-> Dashboard and employee balance update
```

The mock data includes connected employee, contract, schedule, attendance, allocation, request, salary structure, rules, payrun, and payslip records, plus warning scenarios for demonstration.

## Further Documentation

- `PROJECT_CONTEXT.md` contains product direction and technology context.
- `SPRINT_STATE.md` contains the detailed implementation history and sprint notes.
- `CURRENT_STATE.md` contains the earlier foundation-state snapshot and known environment notes.