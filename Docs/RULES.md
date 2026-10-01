# 📋 Development Rules

## PeoplePay360 – Project Guidelines for AI & Human Collaboration

This document defines the development rules, coding standards, and best practices for the PeoplePay360 application. These rules ensure consistency, maintainability, security, and quality. Both AI assistants and human contributors must follow these guidelines.

---

## 1️⃣ General Principles

These rules apply to the entire project.

- ✅ Follow the project documentation (PRD, ARCHITECTURE, DESIGN) before writing code.
- ✅ Keep the code clean, readable, and well-structured.
- ✅ Prioritize simplicity and maintainability.
- ✅ Do not duplicate logic. Reuse existing components, utilities, or services.
- ✅ Make small, focused changes instead of large, risky edits.
- ✅ Do not modify unrelated files.
- ✅ Write self-explanatory code with meaningful variable and function names.

## 2️⃣ Technology & Coding Standards

Rules related to the tech stack and coding style.

| Category | Rule |
| --- | --- |
| 🟦 **Language** | Use TypeScript. Avoid `any` unless absolutely necessary. |
| ⚛️ **Framework** | Follow Next.js App Router best practices. When unsure, read the installed guides in `node_modules/next/dist/docs/` — this Next.js version may differ from older conventions. |
| 🎨 **Styling** | Use Tailwind CSS and the design system in DESIGN.md. Use theme tokens, never hard-coded hex values in components. |
| 🔄 **State & Data** | Use TanStack React Query for server state. Do not fetch inside `useEffect`; go through hooks and services. |
| 📝 **Forms** | Use React Hook Form with Zod schemas for every form. |
| 🧪 **Linting** | Keep `npm run typecheck` green before every commit. Do not rely on `next lint` (removed in the installed Next.js version). |
| 📐 **Formatting** | Consistent formatting, no unused imports, no leftover `console.log` statements. |
| 📦 **Dependencies** | Use stable, well-maintained packages. Do not add a dependency for something the codebase can already do. |
| 🗂 **File Naming** | kebab-case for utilities and services, PascalCase for React components, kebab-case route folders. |

## 3️⃣ Project Structure

Follow the folder structure defined in ARCHITECTURE.md to keep the codebase organized.

- ✅ Place reusable UI primitives in `/src/components/ui`.
- ✅ Feature-specific components belong to their feature folder (`payroll/`, `time-off/`, `dashboard/`, ...).
- ✅ Database and external service logic stays in `/src/server` (server-only modules).
- ✅ Common utilities belong in `/src/lib`.
- ✅ Shared types and domain models belong in `/src/types`.
- ✅ Mock records are isolated under `/src/data/mock` — never import them into pages.
- ✅ Do not create new folders without a clear structural reason.

## 4️⃣ Data & Service Rules

Rules that keep the mock/API dual-mode architecture intact.

- ✅ Pages and components consume hooks and services — never raw mock records or direct `fetch` calls.
- ✅ All backend access goes through the API client boundary in `/src/lib/api`.
- ✅ Mutations must invalidate the queries they affect.
- ✅ Mock mutations are in-memory and reset on restart — never rely on mock persistence.
- ✅ No data-mode branching inside UI components; the service layer handles `mock` vs `api`.

## 5️⃣ Security Rules

Non-negotiable rules for a payroll product.

- 🔒 Never commit `.env` files, credentials, or secrets.
- 🔒 Hash passwords with bcrypt; use signed JWT sessions (jose) in httpOnly cookies.
- 🔒 Enforce RBAC in API routes and server modules — frontend permission checks are UX only.
- 🔒 Validate every server input with Zod before it touches the database.
- 🔒 Salary formulas must run through the safe calculator. `eval` and `new Function` are forbidden.
- 🔒 Financial status and delivery status must never be conflated.

## 6️⃣ Git & Documentation Rules

- ✅ Keep commits small and focused, with clear messages explaining the *why*.
- ✅ Use branch prefixes: `feature/`, `fix/`, `chore/`.
- ✅ Update TASKS.md and MEMORY.md when a phase or milestone completes.
- ✅ Keep README and `Docs/` in sync with the code they describe.
- ✅ Never commit build artifacts, `.next/`, or `node_modules`.
