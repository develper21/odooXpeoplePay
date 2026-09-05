# Sprint State

## Sprint 1: Foundation and Visual System

Status: **Complete**

### Completed Work

- Next.js App Router project configuration.
- Global layout, theme tokens, responsive authenticated shell, sidebar, and top header.
- `/login` authentication page shell with client-side validation and mock behavior.
- `/dashboard` visual foundation with representative mock metrics, charts, alerts, and overview sections.
- Placeholder route architecture for all future HR, payroll, analytics, and administration modules.
- Reusable UI primitives and shared states.
- Centralized role and permission navigation architecture for `EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, and `ADMIN`.
- Future API boundary and TanStack Query provider.
- Environment-controlled data source switching with `NEXT_PUBLIC_DATA_MODE=mock|api`.
- Centralized domain types and realistic interconnected mock records for employees, contracts, schedules, attendance, time off, allocations, salary structures, salary rules, payruns, payslips, and users.
- Stable CRUD services and query hooks, plus mock-capable approve/refuse time-off and compute/validate/pay/send-payslips payrun workflows.

### Routes

`/login`, `/dashboard`, `/employees`, `/contracts`, `/schedules`, `/attendance`, `/time-off`, `/payroll`, `/payroll/new`, `/payslips`, `/salary-structures`, `/salary-rules`, `/reports`, `/users`, `/roles`, `/settings`.

### Main Files and Areas Added

- `src/app/` App Router layouts and pages.
- `src/components/layout/` application shell, sidebar, and header.
- `src/components/ui/` button, input, card, badge, and toast primitives.
- `src/components/shared/` page headers, metrics, tables, states, and placeholders.
- `src/components/dashboard/` Recharts dashboard visuals.
- `src/lib/permissions.ts`, `src/lib/api/client.ts`, and `src/lib/utils.ts`.
- `src/types/index.ts`.
- `package.json`, `tsconfig.json`, `postcss.config.mjs`, `components.json`.

### APIs Integrated

No backend is integrated. API mode calls the configured `NEXT_PUBLIC_API_BASE_URL`; mock mode uses the in-memory store. UI data access goes through hooks and services, while raw mock modules are isolated under `src/data/mock`.

### Known Issues

Native SWC is unavailable in the local Windows environment. Scripts use `next dev --webpack` and `next build --webpack`; builds and route smoke tests pass.

Mock mutations are in-memory and reset when the browser session/module process restarts.

### Exact Next Task

Sprint 2 should begin with the Employee central HR hub: define the employee domain/API contract, add the employee list and detail routes, and connect contracts, schedules, attendance, and time-off navigation from the employee context. Do not begin payroll calculation logic until the employee foundation is connected.
