# 🎨 Design System

## PeoplePay360 – Clean. Professional. Productive.

This document defines the visual design system, UI components, and user experience guidelines for PeoplePay360. The goal is to create a modern, minimal, and professional enterprise interface — the **PeoplePay360 Midnight** experience — with a consistent look across every module and device.

---

## 1. Design Principles

| 👥 **User-Centered** | 🌿 **Minimal & Clean** | 🧩 **Consistent** |
| --- | --- | --- |
| Simple and intuitive for HR teams, payroll users, and employees. | Reduce clutter and focus on data, statuses, and actions. | Follow a unified design system across all modules. |

## 2. Color Palette

Primary colors used across the application.

### Brand

| Color | Hex | Usage |
| --- | --- | --- |
| 🟪 **Primary** | `#4A1D54` | Main brand color. Buttons, links, active states. |
| 🟣 **Primary Hover** | `#3B1444` | Hover and pressed states. |
| ⬜ **Primary Light** | `#F3E8F6` | Soft highlights, selected rows, subtle badges. |

### Surfaces & Borders

| Color | Hex | Usage |
| --- | --- | --- |
| ⬜ **Background** | `#F9F6F0` | App background (warm cream). |
| ⬜ **Surface** | `#FFFFFF` | Cards, tables, panels. |
| ⬜ **Surface Raised** | `#F5F0E6` | Raised panels, section headers. |
| ⬜ **Surface Soft** | `#EEE8DC` | Inset areas, muted rows. |
| 🟫 **Border** | `#E8E0D2` | Default borders and dividers. |
| 🟫 **Border Subtle** | `#F0EAE0` | Faint separators. |

### Text

| Color | Hex | Usage |
| --- | --- | --- |
| ⬛ **Text** | `#1E1722` | Primary text. |
| ⬛ **Text Secondary** | `#665A6B` | Labels, helper text. |
| ⬛ **Text Muted** | `#8E8293` | Captions, placeholders, disabled text. |

### Status

| Color | Hex | Usage |
| --- | --- | --- |
| 🟩 **Success** | `#16A34A` | Completed, paid, approved, positive values. |
| 🟧 **Warning** | `#D97706` | Warnings, pending states, caution. |
| 🟥 **Danger** | `#DC2626` | Errors, validation, destructive actions. |

### Navigation

| Color | Hex | Usage |
| --- | --- | --- |
| 🟪 **Sidebar** | `#28162C` | Sidebar background (dark midnight purple). |
| 🟪 **Sidebar Border** | `#3A213F` | Sidebar dividers. |
| ⬜ **Sidebar Text** | `#F5EFF7` | Sidebar labels. |
| ⬜ **Sidebar Muted** | `#A892B0` | Inactive sidebar items. |
| 🟪 **Sidebar Active** | `#46254D` | Active sidebar item. |
| 🟨 **Logo Accent** | `#E89938` | Brand mark accent (amber). |

## 3. Typography

We use the **system stack** as the primary font for a clean and neutral enterprise look.

| | |
| --- | --- |
| **Aa** | **Arial / System Stack** — Primary Font |
| | `Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — clean, modern, and highly readable on every platform. Tailwind's `font-sans` token maps to Geist Sans via `next/font`. |

### Type Scale

| Element | Size | Weight | Usage |
| --- | --- | --- | --- |
| H1 | 30px / 1.875rem | 700 | Page titles |
| H2 | 24px / 1.5rem | 600 | Section titles |
| H3 | 20px / 1.25rem | 600 | Card titles |
| Body | 14px / 0.875rem | 400 | Default text |
| Small | 12px / 0.75rem | 400 | Meta, captions, table hints |
| Mono | 13px | 400 | IDs, tokens, code |

## 4. UI Components

Standard components to be used throughout the application.

### Buttons

| Variant | Appearance | Usage |
| --- | --- | --- |
| **Primary** | Deep purple `#4A1D54`, white text | Main actions: Save, Create, Approve, Mark Paid |
| **Secondary** | Surface background, `#E8E0D2` border | Cancel, back, secondary actions |
| **Destructive** | Danger `#DC2626`, white text | Delete, refuse, irreversible actions |
| **Ghost** | Transparent, hover surface | Toolbars, row actions |

### Core Components

- **Cards** — white surface, 1px border `#E8E0D2`, rounded corners, subtle shadow.
- **Tables** — sticky headers, row hover, status badges, horizontal scroll on small screens.
- **Badges** — status chips using status colors: ✅ Paid / Approved, 🟧 Pending, 🟥 Failed / Refused.
- **Form fields** — label above input, Zod validation, inline errors in danger color.
- **Dialogs** — confirmation required for destructive and financial actions.
- **States** — loading skeletons, empty states with icon + message + action, error states with retry.
- **Charts** — Recharts styled with theme tokens for salary trends and department costs.
- **Shell** — dark midnight sidebar (`#28162C`), header with breadcrumbs, role-aware navigation.

## 5. Layout & Spacing

- Base spacing unit: **4px** grid; common steps 8 / 12 / 16 / 24 / 32px.
- Page content uses consistent responsive padding; cards and tables align to the same grid.
- Scrollbars are hidden app-wide while scrolling remains functional.
- Print styles hide navigation and interactive controls so payslips print cleanly.

## 6. Responsive Behavior

- Desktop-first enterprise layout with tablet and mobile breakpoints.
- Sidebar collapses on smaller screens; navigation remains reachable.
- Dashboard grids stack vertically; tables scroll horizontally instead of shrinking.
- The payslip print layout stays A4-friendly on every screen size.
