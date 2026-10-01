# 🧠 Project Memory

## PeoplePay360 – Context, Progress & Important Notes

This document keeps track of the current state of the project, important decisions, and things to remember. It helps maintain continuity across development sessions or new contributors.

| 📅 **Last Updated** | 🧭 **Current Phase** | 📊 **Progress** |
| --- | --- | --- |
| **Oct 1, 2026** | **Phase 10** — Quality & Deployment | **96%** ▓▓▓▓▓▓▓▓▓░ |

---

## 🎯 Current Status

- ✅ Project setup completed (Next.js, TypeScript, Tailwind v4)
- ✅ Git repository initialized and pushed to GitHub
- ✅ Design system (Midnight tokens) and UI primitives completed
- ✅ Authentication (login, JWT sessions, protected routes) completed
- ✅ RBAC (5 roles, permission matrix, role-aware navigation) completed
- ✅ HR master data (employees, contracts, schedules, attendance) completed
- ✅ Time off module (types, allocations, requests, approvals, balances) completed
- ✅ Compensation (salary structures, rules, safe calculation engine) completed
- ✅ Payroll & payslips (payrun workflow, PDF boundary, delivery) completed
- ✅ Dashboard, reports, and administration completed
- ✅ Backend (PostgreSQL + Drizzle, API routes, server payrun processor, payslip PDF/email) completed
- ✅ Vercel deployment with production env pipeline completed
- 🔄 Working on quality hardening (ESLint config, browser smoke tests, automated test suite)

## ✅ Completed Tasks

| # | Task | Completed On |
| --- | --- | --- |
| 1 | Project setup, design tokens & UI primitives | Sep 5, 2026 |
| 2 | Authentication & RBAC | Sep 6, 2026 |
| 3 | HR master data (employees, contracts, schedules, attendance) | Sep 6, 2026 |
| 4 | Time off module | Sep 6, 2026 |
| 5 | Compensation & safe salary engine | Sep 6, 2026 |
| 6 | Payroll & payslips | Sep 6, 2026 |
| 7 | Dashboard & reports | Sep 6, 2026 |
| 8 | Administration | Sep 6, 2026 |
| 9 | Backend & database integration | Oct 1, 2026 |
| 10.1–10.4 | Typecheck/build, audits, Vercel deployment | Oct 1, 2026 |

## 🔄 In Progress

| # | Task | Notes |
| --- | --- | --- |
| 1.6 | Configure ESLint and Prettier | `next lint` was removed in the installed Next.js version — needs a fresh ESLint config |
| 10.5 | Browser smoke tests (Playwright) | Needs a local Chrome/Edge/Chromium runtime |
| 10.6 | Automated test suite | Not started — next up |

## 💡 Key Decisions & Notes

- **Dual data mode** — `NEXT_PUBLIC_DATA_MODE=mock|api` switches the data source without touching UI code. Mock mutations are in-memory and reset on restart.
- **Safe salary arithmetic** — formulas are parsed deterministically; `eval` and `new Function` are forbidden.
- **Payrun state machine** — `DRAFT → COMPUTED → VALIDATED → PAID`. Warnings never block; validation errors do.
- **Status separation** — payslip financial status (`DRAFT`/`COMPUTED`/`VALIDATED`/`PAID`) is independent of delivery status (`PENDING`/`SENT`/`FAILED`). Payslips can only be sent after the payrun is `PAID`.
- **Security boundary** — frontend RBAC is UX only; API routes and server modules are the production authorization boundary.
- **Dev accounts** — all mock accounts use the password `peoplepay`. Development only, never production.
- **Build note** — scripts use Webpack because native SWC may be unavailable on Windows; the fallback compiler builds successfully.

## 🚀 Next Up

1. Add a working ESLint configuration and fix the lint script
2. Run browser smoke tests on `/login`, `/dashboard`, and `/payslips`
3. Introduce an automated test suite for services and salary calculations
4. Keep README and `Docs/` in sync as the backend hardens

## 🔗 Key References

- [PRD.md](./PRD.md) — product requirements
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design and folder structure
- [RULES.md](./RULES.md) — development rules and standards
- [DESIGN.md](./DESIGN.md) — design system and tokens
- [TASKS.md](./TASKS.md) — full task breakdown
- [README.md](../README.md) — project overview, routes, and demo flows
