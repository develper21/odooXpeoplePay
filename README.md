# PeoplePay360

PeoplePay360 is an HR and payroll operations workspace built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-compatible primitives, TanStack Query, React Hook Form, Zod, Recharts, and Lucide React.

## Development

```bash
npm install
npm run dev
```

The application runs at `http://localhost:3000`. Sprint 1 includes the responsive application shell, login foundation, dashboard visual foundation, centralized permissions/navigation, reusable UI primitives, and placeholder module routes.

## Data Mode

The application starts in mock mode through `.env.local`:

```env
NEXT_PUBLIC_DATA_MODE=mock
```

Set `NEXT_PUBLIC_DATA_MODE=api` and provide `NEXT_PUBLIC_API_BASE_URL` to switch services to the backend without changing page components. The flow is `UI -> hooks -> services -> mock store or API client`. Mock records live under `src/data/mock`, while stable resource services and workflow actions live under `src/lib/services`.

## Validation

```bash
npm run typecheck
npm run build
```

See `SPRINT_STATE.md` for the current implementation boundary and the recommended Sprint 2 starting point.

Sprint 3 adds the employee and contract HR master-data experience: list/kanban views, filters, linked employee records, CRUD forms, contract history, active-contract context, smart buttons, and related placeholders for upcoming attendance and time-off work.

## Sprint 2 Authentication

The development login exposes five mock accounts for testing `EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, and `ADMIN`. The selected session is persisted through the centralized auth storage abstraction. Route access, sidebar visibility, header identity, and action visibility are all evaluated through the shared permission map. This is frontend RBAC for development UX; production authorization must also be enforced by the backend.