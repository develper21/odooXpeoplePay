# Current State

## Sprint

Sprint 6 (Salary Structures + Salary Rules) is complete. Previous sprints (Sprint 1 Foundation, Sprint 2 Auth & RBAC, Sprint 3 Employees & Contracts, Sprint 4 Working Schedules & Attendance, Sprint 5 Time Off) remain intact.

## Completed

- Bootstrapped Next.js App Router and TypeScript project structure.
- Added Tailwind CSS v4, shadcn configuration, and centralized dark design tokens.
- Added responsive AppShell with sidebar, header, mobile navigation toggle, breadcrumbs/context, search entry point, notifications, and user dropdown.
- Added mock ADMIN role navigation with centralized role, permission, and navigation types.
- Added login UI with React Hook Form, Zod validation, password visibility, remember-me control, loading state, and mock success feedback.
- Added dashboard foundation with mock KPI metrics, Recharts salary and trend charts, payroll alerts, and operational overview.
- Added reusable buttons, inputs, cards, status badges, table foundation, page headers, metric cards, placeholder pages, and loading/empty/error/toast states.
- Added API client boundary and TanStack Query provider without backend calls.
- Added all requested placeholder routes.
- Added environment-controlled `mock`/`api` data mode with `.env.local` defaulting to mock.
- Added shared domain models, interconnected mock datasets, in-memory CRUD store, resource services, query hooks, and time-off/payrun workflow actions.
- Connected the dashboard to `useDashboard()` instead of page-owned mock constants.
- Added centralized mock authentication with five realistic development accounts, persisted session storage, auth provider/context, loading state, login redirect, logout, and backend-ready auth service.
- Added canonical granular permission definitions, inherited role mappings, route permission resolution, permission/role gates, protected route handling, role-aware navigation, current-user header identity, and `/unauthorized`.
- Added action-level permission examples for payrun creation and salary configuration editing.

## Verification

- `npm run typecheck` passes.
- `npm run build` passes using Webpack.
- Dev smoke test passed with HTTP 200 for `/login`, `/dashboard`, `/employees`, `/payroll/new`, and `/settings`.

## Known Issues

- The local Windows environment cannot load the installed native Next.js SWC binding, so `dev` and `build` use the Webpack fallback. The warning is non-blocking and the app compiles successfully.
- Authentication, dashboard values, navigation role selection, and API responses are mock/foundation behavior only.
- The API service paths are prepared, but no backend is running in this repository.
- Mock mutations are in-memory and reset when the browser session/module process restarts.
- Browser automation could not be run because the local Playwright Chromium executable is not installed; typecheck and production build were run successfully.
- Employee and contract success feedback currently uses navigation plus mutation error states; the existing Toast primitive remains available but is not yet centralized as a global notification provider.
