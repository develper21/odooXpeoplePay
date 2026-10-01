# 🏛 System Architecture

## PeoplePay360 – HR & Payroll Operations Dashboard

This document describes the overall system architecture, technology stack, folder structure, data flow, and key design decisions for the PeoplePay360 application.

---

## 1. High-Level Architecture

PeoplePay360 follows a full-stack architecture using **Next.js** and **PostgreSQL**. The Next.js frontend renders the UI, Next.js API routes implement backend logic behind guarded server modules, and PostgreSQL via Drizzle ORM persists data. A dual **mock/API data mode** lets the same UI run on in-memory stores for demos or a real backend for production.

```text
┌───────────────┐  HTTPS/JSON  ┌──────────────────┐  Hooks/   ┌──────────────────────┐  SQL/ORM  ┌──────────────────────┐
│     User      │ ◄──────────► │  Next.js         │  Services │  Next.js Backend     │ ◄───────► │  PostgreSQL          │
│ (Web Browser) │              │  Frontend        │ ◄───────► │  (API Routes /       │  Drizzle  │  (Data + Migrations) │
│               │              │  (UI / Client)   │           │   Server Modules)    │           │                      │
└───────────────┘              └──────────────────┘           └──────────┬───────────┘           └──────────────────────┘
                                                                         │
                                                                         ▼
                                                            ┌─────────────────────────┐
                                                            │  Payslip PDF (PDFKit)   │
                                                            │  Payslip Email          │
                                                            │  (Nodemailer)           │
                                                            └─────────────────────────┘
```

## 2. Technology Stack

Technologies used in the project and their purpose.

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js (App Router) | UI framework and routing |
| Language | TypeScript | Type-safe and better developer experience |
| Styling | Tailwind CSS v4 | Modern and responsive UI |
| UI Components | shadcn/ui-compatible local primitives | Consistent component system |
| Icons | Lucide React | Icon set |
| Charts | Recharts | Dashboard and report visualizations |
| Data Fetching | TanStack React Query | Queries, mutations, cache invalidation |
| Forms & Validation | React Hook Form + Zod | Form state and schema validation |
| Backend | Next.js API Routes | REST endpoints and server workflows |
| Authentication | jose (JWT) + bcryptjs | Signed sessions and password hashing |
| Database | PostgreSQL + Drizzle ORM | Relational persistence and migrations |
| Email | Nodemailer | Payslip delivery |
| PDF | PDFKit | Server-generated payslip PDFs |
| Deployment | Vercel | Hosting and deployment |
| Version Control | Git + GitHub | Source code management |

## 3. Folder Structure

The project follows a feature-oriented folder structure to keep the code organized and scalable.

```text
peoplepay360/
├── Docs/                     # Product documentation (PRD, ARCHITECTURE, RULES, DESIGN, TASKS, MEMORY)
├── drizzle/                  # Generated SQL migrations + metadata
├── db/                       # Migration and seed runner scripts (node)
├── postman/                  # API collection
├── src/
│   ├── app/
│   │   ├── (auth)/           #   Authentication routes (/login)
│   │   ├── (dashboard)/      #   Protected product routes
│   │   ├── api/              #   Backend API routes (auth, payruns, payslips, ...)
│   │   ├── unauthorized/     #   Access-denied page
│   │   ├── globals.css       #   Theme tokens and print styles
│   │   └── layout.tsx        #   Root layout
│   ├── components/
│   │   ├── ui/               #   Reusable local UI primitives
│   │   ├── layout/           #   App shell, sidebar, header, breadcrumbs
│   │   ├── dashboard/        #   Charts and operational widgets
│   │   ├── payroll/          #   Payrun, payslip, and delivery UI
│   │   ├── time-off/         #   Allocation, request, and balance UI
│   │   ├── auth/             #   Protected routes and permission gates
│   │   └── shared/           #   Tables, states, headers, metrics, buttons
│   ├── data/mock/            #   Mock domain records and development accounts
│   ├── hooks/                #   TanStack Query and permission hooks
│   ├── lib/
│   │   ├── api/              #   Backend API client boundary
│   │   ├── auth/             #   Auth service, storage, and types
│   │   ├── services/         #   Resource services and business workflows
│   │   ├── salary-calculator.ts  # Safe salary calculation engine
│   │   ├── time-off-utils.ts     # Allocation availability and duration rules
│   │   └── permissions.ts        # Roles, permissions, route access, navigation
│   ├── server/               #   Server-only: db, auth guard, schema,
│   │                         #   payrun processor, payslip PDF, payslip email
│   └── types/
│       └── domain.ts         #   Shared domain models
├── drizzle.config.mjs        # Drizzle Kit configuration
└── package.json
```

## 4. Data Flow

```text
Page or component
  → TanStack Query hook
  → domain service
  → mock store  OR  API client        # NEXT_PUBLIC_DATA_MODE = mock | api
  → Next.js API routes
  → server guard + validation (auth, permissions, Zod)
  → PostgreSQL (Drizzle ORM)
```

Pages and components use hooks and services — they never import raw mock records. Mock records are isolated under `src/data/mock`; service and workflow boundaries live under `src/lib/services`.

## 5. Key Design Decisions

1. **Dual data mode** — `NEXT_PUBLIC_DATA_MODE` switches the same UI between in-memory mock stores and the real API without rewriting page components.
2. **Service abstraction** — all reads and mutations flow through typed domain services, keeping data sources replaceable.
3. **Server-only boundary** — secrets, DB access, PDF, and email logic live in `src/server` behind the `server-only` package and can never leak into client bundles.
4. **RBAC everywhere** — five canonical roles enforced via `permissions.ts`, `ProtectedRoute`, `PermissionGate`, `RoleGate`, and server-side API guards. The backend remains the production security boundary.
5. **Payrun state machine** — payroll moves strictly through `DRAFT → COMPUTED → VALIDATED → PAID`, with warnings separated from blocking validation errors.
6. **Status separation** — payslip financial status (`DRAFT`, `COMPUTED`, `VALIDATED`, `PAID`) is independent of delivery status (`PENDING`, `SENT`, `FAILED`).
7. **Safe salary arithmetic** — formula rules are parsed and evaluated deterministically without `eval` or `new Function`, with dependency and cycle validation.
