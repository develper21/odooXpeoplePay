"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useUsers, useEmployees } from "@/hooks/use-data";
import { roleLabels } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import type { Role } from "@/lib/auth/auth-types";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const pathname = usePathname() || "";
  const isUsersRoute = pathname.startsWith("/users");
  const isEmployeesRoute = pathname.startsWith("/employees");
  const { data: users = [] } = useUsers({ enabled: isUsersRoute });
  const { data: employees = [] } = useEmployees({ enabled: isEmployeesRoute } as any);

  const getCrumbs = (): Crumb[] => {
    if (!pathname || pathname === "/dashboard") {
      return [{ label: "Workspace" }, { label: "Dashboard" }];
    }

    // Administration
    if (pathname === "/users") {
      return [{ label: "Administration" }, { label: "Users" }];
    }
    if (pathname === "/users/new") {
      return [
        { label: "Administration" },
        { label: "Users", href: "/users" },
        { label: "New User" },
      ];
    }
    if (pathname.startsWith("/users/") && pathname.endsWith("/edit")) {
      const id = pathname.split("/")[2];
      const targetUser = users.find((u) => u.id === id);
      const name = targetUser ? targetUser.name : id;
      return [
        { label: "Administration" },
        { label: "Users", href: "/users" },
        { label: name, href: `/users/${id}` },
        { label: "Edit" },
      ];
    }
    if (pathname.startsWith("/users/")) {
      const id = pathname.split("/")[2];
      const targetUser = users.find((u) => u.id === id);
      const name = targetUser ? targetUser.name : id;
      return [
        { label: "Administration" },
        { label: "Users", href: "/users" },
        { label: name },
      ];
    }
    if (pathname === "/roles") {
      return [{ label: "Administration" }, { label: "Roles & Permissions" }];
    }
    if (pathname.startsWith("/roles/")) {
      const roleKey = pathname.split("/")[2] as Role;
      const label = roleLabels[roleKey] || roleKey;
      return [
        { label: "Administration" },
        { label: "Roles", href: "/roles" },
        { label: label },
      ];
    }
    if (pathname.startsWith("/settings")) {
      return [{ label: "Administration" }, { label: "Settings" }];
    }

    // Time Off
    if (pathname === "/time-off") {
      return [{ label: "Time Off" }, { label: "Overview" }];
    }
    if (pathname === "/time-off/allocations") {
      return [
        { label: "Time Off", href: "/time-off" },
        { label: "Allocations" },
      ];
    }
    if (pathname === "/time-off/allocations/new") {
      return [
        { label: "Time Off", href: "/time-off" },
        { label: "Allocations", href: "/time-off/allocations" },
        { label: "New Allocation" },
      ];
    }
    if (pathname.startsWith("/time-off/allocations/")) {
      const id = pathname.split("/")[3]?.toUpperCase() || "ALLOC";
      return [
        { label: "Time Off", href: "/time-off" },
        { label: "Allocations", href: "/time-off/allocations" },
        { label: id },
      ];
    }
    if (pathname === "/time-off/requests") {
      return [{ label: "Time Off", href: "/time-off" }, { label: "Requests" }];
    }
    if (pathname === "/time-off/requests/new") {
      return [
        { label: "Time Off", href: "/time-off" },
        { label: "Requests", href: "/time-off/requests" },
        { label: "New Request" },
      ];
    }
    if (pathname.startsWith("/time-off/requests/")) {
      const id = pathname.split("/")[3]?.toUpperCase() || "REQUEST";
      return [
        { label: "Time Off", href: "/time-off" },
        { label: "Requests", href: "/time-off/requests" },
        { label: id },
      ];
    }
    if (pathname.startsWith("/time-off/types")) {
      return [
        { label: "Time Off", href: "/time-off" },
        { label: "Leave Types" },
      ];
    }

    // Payroll
    if (pathname === "/payroll") {
      return [{ label: "Payroll" }, { label: "Payruns" }];
    }
    if (pathname.startsWith("/payroll/")) {
      const id = pathname.split("/")[2]?.toUpperCase() || "PAYRUN";
      return [
        { label: "Payroll", href: "/payroll" },
        { label: "Payruns", href: "/payroll" },
        { label: id },
      ];
    }
    if (pathname === "/payslips") {
      return [{ label: "Payroll" }, { label: "Payslips" }];
    }
    if (pathname.startsWith("/payslips/")) {
      const id = pathname.split("/")[2]?.toUpperCase() || "PAYSLIP";
      return [
        { label: "Payroll" },
        { label: "Payslips", href: "/payslips" },
        { label: id },
      ];
    }
    if (pathname.startsWith("/salary-structures")) {
      return [{ label: "Payroll" }, { label: "Salary Structures" }];
    }
    if (pathname.startsWith("/salary-rules")) {
      return [{ label: "Payroll" }, { label: "Salary Rules" }];
    }

    // Analytics / Reports
    if (pathname.startsWith("/reports")) {
      return [{ label: "Analytics" }, { label: "Reports" }];
    }

    // Core HR
    if (pathname === "/employees") {
      return [{ label: "HR" }, { label: "Employees" }];
    }
    if (pathname.startsWith("/employees/")) {
      const id = pathname.split("/")[2];
      const targetEmp = employees.find((e) => e.id === id);
      const name = targetEmp ? employeeName(targetEmp) : id;
      return [
        { label: "HR" },
        { label: "Employees", href: "/employees" },
        { label: name },
      ];
    }
    if (pathname.startsWith("/contracts")) {
      return [{ label: "HR" }, { label: "Contracts" }];
    }
    if (pathname.startsWith("/attendance")) {
      return [{ label: "HR" }, { label: "Attendance" }];
    }
    if (pathname.startsWith("/schedules")) {
      return [{ label: "HR" }, { label: "Working Schedules" }];
    }

    // Fallback
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((s, idx) => ({
      label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "),
      href:
        idx < segments.length - 1
          ? `/${segments.slice(0, idx + 1).join("/")}`
          : undefined,
    }));
  };

  const crumbs = getCrumbs();

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden items-center gap-1.5 text-xs sm:flex"
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <div
            key={`${crumb.label}-${idx}`}
            className="flex items-center gap-1.5"
          >
            {idx > 0 && <ChevronRight className="size-3 text-text-muted/60" />}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-text-muted transition-colors hover:text-text-primary"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  isLast ? "font-semibold text-text-primary" : "text-text-muted"
                }
              >
                {crumb.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
