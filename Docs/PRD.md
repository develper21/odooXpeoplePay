# 📄 Product Requirements Document (PRD)

## PeoplePay360 – Your HR & Payroll Operations Companion

This document defines the product requirements for **PeoplePay360** — what we are building, for whom, and why.

| | |
| --- | --- |
| **Version:** | 1.0 |
| **Date:** | Oct 1, 2026 |
| **Author:** | Team PeoplePay360 |
| **Status:** | Draft |
| **Target Launch:** | MVP (v1.0) |

---

## 1. Product Overview

PeoplePay360 is a web application designed to help organizations manage their complete HR and payroll operations — including employees, contracts, schedules, attendance, time off, compensation, payroll processing, payslips, reports, and administration — all in one place.

## 2. Problem Statement

Organizations often manage employee records, attendance, leave, and payroll in disconnected spreadsheets and manual tools. Manual salary calculations, scattered data, and unclear approval flows lead to payroll errors, delayed payslips, compliance risk, and wasted HR hours — especially for teams that cannot afford enterprise HR suites.

## 3. Goals

- Provide a simple, unified platform for HR and payroll operations
- Help HR teams manage the full employee lifecycle — from contract to payslip — without spreadsheets
- Automate salary and payroll calculations with deterministic, safe business rules
- Offer a clean, modern, and professional user experience with role-based access

## 4. Target Users

- Small and mid-sized companies without dedicated HR software
- HR managers handling employee records, contracts, schedules, and attendance
- Payroll users and payroll managers processing monthly payroll runs
- Administrators managing users, roles, permissions, and settings
- Employees who need visibility into their attendance, leave balances, and payslips

## 5. Core Features (MVP)

1. **User Authentication** (Sign up / Login / Session management)
2. **Role-Based Access Control** (5 canonical roles, permission matrix, role-aware navigation)
3. **Dashboard** (role-aware workspaces, payroll KPIs, attendance and time-off overviews)
4. **Employees & Contracts** (CRUD, kanban views, smart hub links, period validation)
5. **Schedules & Attendance** (CRUD, worked minutes, missing-checkout handling)
6. **Time Off** (types, allocations, requests, approvals, balance consumption)
7. **Compensation** (salary structures, salary rules, safe formula engine, live previews)
8. **Payroll Processing** (payrun wizard: `DRAFT → COMPUTED → VALIDATED → PAID`)
9. **Payslips** (breakdown, printable layout, PDF generation, email delivery)
10. **Reports & Analytics** (payroll, department, attendance, time-off; CSV export)
11. **Administration** (users, roles, permission matrix, organization settings)

## 6. Out of Scope (v1.0)

- Native mobile applications (responsive web only)
- Multi-organization / tenant support
- Biometric or hardware attendance integrations
- Country-specific statutory tax engines beyond configurable salary rules

## 7. Success Metrics

- A full payrun — from selection to payslip delivery — completable in under 15 minutes
- Zero manual spreadsheet steps in the payroll workflow
- Payslip delivery success visible per employee with explicit failure reporting
- Every HR action gated by the correct role without workarounds
