# PeoplePay360

PeoplePay360 is a full-stack HR and payroll management system built with Next.js. The project includes a frontend application for employee, attendance, compensation, payroll, and admin workflows, along with a separate backend API for persistence, authentication, email, and payslip generation.

## Project overview

This repository is organized as a monorepo with two main parts:

- Frontend: root Next.js app under `src/`
- Backend: API + database layer under `backend/`

The UI is built for an HR/payroll workflow and supports mock data mode as well as real API integration. The project is designed to manage employee master data, payroll processing, payslips, schedules, approvals, and admin permissions.

## Tech stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- App Router structure
- TanStack React Query
- React Hook Form
- Zod validation
- Recharts for dashboard/reporting
- Lucide icons

### Backend
- Next.js app in `backend/`
- Drizzle ORM
- PostgreSQL
- JWT/session-style auth via cookies
- Nodemailer for email delivery
- PDFKit for payslip PDF generation
- Server-side validation and payroll logic

## Repository structure

```text
odooXpeoplePay/
├── src/                  # Frontend application
│   ├── app/              # App Router pages and route groups
│   ├── components/       # Reusable UI and domain components
│   ├── hooks/            # Auth, data, and permission hooks
│   ├── lib/              # Utilities and service layer
│   ├── data/             # Mock data and demo records
│   └── types/            # Shared TypeScript types
├── backend/              # Backend API and DB layer
│   ├── app/              # Backend Next.js routes
│   ├── db/               # Migrations and seed scripts
│   ├── drizzle/          # SQL migrations metadata
│   ├── lib/              # Auth, DB, payroll, PDF utilities
│   └── package.json      # Backend dependencies/scripts
├── Docs/                 # Project documentation
├── postman/              # API testing docs
├── public/               # Static assets
├── package.json          # Frontend package config
├── next.config.mjs       # Next.js config
├── components.json       # UI component config
├── README.md             # Project overview
├── .env.example          # Frontend env example
└── .gitignore
```

## Core modules

The application currently covers:

- Dashboard and KPI reporting
- Employees and contracts
- Attendance and schedules
- Time-off management
- Salary structures and salary rules
- Payroll runs and validation
- Payslips and payment workflow
- Roles, users, permissions, and settings
- Admin operations and RBAC-aware navigation

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL for the backend database
- Optional: browser for manual UI testing

## Frontend setup

From the project root:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

Frontend env configuration is defined in `.env.example`:

```env
NEXT_PUBLIC_DATA_MODE=mock
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

Set `NEXT_PUBLIC_DATA_MODE=api` when you want the frontend to connect to the backend instead of the mock data layer.

## Backend setup

Navigate to the backend folder:

```bash
cd backend
npm install
```

Create your local environment file for the backend (based on your project configuration), then run:

```bash
npm run dev
```

The backend is configured to run on port `3100` by default.

## Database commands

From `backend/`:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

These commands are used for schema generation, migration execution, and local seed data setup.

## Useful scripts

At the frontend root:

```bash
npm run build
npm run start
npm run lint
npm run typecheck
```

At the backend root:

```bash
npm run build
npm run lint
npm run db:migrate
npm run db:seed
```

## Development notes

- The frontend supports a mock data mode for demos and local development.
- The backend handles API and persistence logic for production-style workflows.
- The project uses separate UI and API concerns so pages can work with either mock or live backend data depending on configuration.
- Postman samples and developer docs are available under `postman/` and `Docs/`.

## License

This project is licensed under the MIT License. See `LICENSE` for details.

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