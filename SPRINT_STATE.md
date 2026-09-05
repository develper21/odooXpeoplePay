# Sprint State

## Sprint 3: Employees and Contracts

Status: **Complete**

Sprint 1 foundation and Sprint 2 authentication/RBAC remain complete and were extended in place.

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
- Mock auth service with five role-specific accounts, centralized browser session storage, auth provider/context, loading state, login/logout behavior, and API-mode login/logout boundary.
- Canonical granular permission union, explicit inherited role-to-permission mapping, route permission resolution, `PermissionGate`, `RoleGate`, protected route guard, unauthorized page, dynamic sidebar, and current-user header menu.
- Action-level gates for payrun creation and salary structure/rule editing.
- Employee domain expanded with employee type, contact information, and 16 realistic connected records across departments, managers, schedules, statuses, and employment types.
- Contract domain expanded with references, departments, positions, salary structure links, dates, active/history statuses, and preserved historical records.
- Employees list supports query-backed list/kanban switching, search, status/department filters, reset, employee-role self scoping, and permission-aware creation.
- Added employee create/edit/detail/delete flows, central HR hub smart buttons, active contract highlighting, contract history, confirmation dialog, and related route placeholders.
- Added contracts list, create, edit, detail, delete, employee-specific history, wage/date/status display, active highlighting, and salary structure linkage.

### Routes

`/login`, `/dashboard`, `/employees`, `/employees/new`, `/employees/[id]`, `/employees/[id]/edit`, `/employees/[id]/contracts`, `/employees/[id]/attendance`, `/employees/[id]/time-off`, `/employees/[id]/allocations`, `/contracts`, `/contracts/new`, `/contracts/[id]`, `/contracts/[id]/edit`, `/schedules`, `/attendance`, `/time-off`, `/payroll`, `/payroll/new`, `/payslips`, `/salary-structures`, `/salary-rules`, `/reports`, `/users`, `/roles`, `/settings`, `/unauthorized`.

### Main Files and Areas Added

- `src/app/` App Router layouts and pages.
- `src/components/layout/` application shell, sidebar, and header.
- `src/components/ui/` button, input, card, badge, and toast primitives.
- `src/components/shared/` page headers, metrics, tables, states, and placeholders.
- `src/components/dashboard/` Recharts dashboard visuals.
- `src/lib/permissions.ts`, `src/lib/api/client.ts`, and `src/lib/utils.ts`.
- `src/types/index.ts`.
- `src/types/domain.ts`, `src/lib/hr-utils.ts`, `src/components/employees/employee-form.tsx`, `src/components/contracts/contract-form.tsx`, `src/components/shared/smart-button.tsx`, and `src/components/ui/confirmation-dialog.tsx`.
- `package.json`, `tsconfig.json`, `postcss.config.mjs`, `components.json`.

### APIs Integrated

No backend is integrated. API mode calls the configured `NEXT_PUBLIC_API_BASE_URL`; auth mode calls `/auth/login` and `/auth/logout`. Mock mode uses the in-memory store and mock auth accounts. UI data access goes through hooks/services, while raw mock modules are isolated under `src/data/mock`.

### Known Issues

Native SWC is unavailable in the local Windows environment. Scripts use `next dev --webpack` and `next build --webpack`; builds and route smoke tests pass.

Mock mutations are in-memory and reset when the browser session/module process restarts.

Playwright browser verification was unavailable because the local Chromium executable is not installed. Manual browser CRUD and responsive verification remains recommended once browser tooling is available.

Sprint 3 deliberately does not implement attendance or time-off business logic, payroll computation, salary configuration, or backend persistence. Related employee routes preserve the future relationship and show clear placeholders.

### Exact Next Task

Sprint 4 should begin with Working Schedules and Attendance: replace the related placeholders with schedule assignment and attendance workflows while consuming the employee/contract relationships established here.
