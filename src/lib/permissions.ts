import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, CalendarDays, CircleDollarSign, ClipboardList, FileText, Layers, LayoutDashboard, ListFilter, LockKeyhole, Settings, ShieldCheck, UserRound, Users, WalletCards } from "lucide-react";
import type { Role } from "@/lib/auth/auth-types";

export type Permission =
  | "dashboard.read"
  | "employee.read" | "employee.create" | "employee.update" | "employee.delete"
  | "attendance.read" | "attendance.create" | "attendance.update" | "attendance.delete"
  | "contract.read" | "contract.create" | "contract.update" | "contract.delete"
  | "schedule.read" | "schedule.create" | "schedule.update" | "schedule.delete"
  | "timeoff.read" | "timeoff.create" | "timeoff.update" | "timeoff.delete" | "timeoff.approve" | "timeoff.refuse"
  | "payrun.read" | "payrun.create" | "payrun.update" | "payrun.delete" | "payrun.compute" | "payrun.validate" | "payrun.mark_paid"
  | "payslip.read" | "payslip.create" | "payslip.update" | "payslip.delete" | "payslip.print" | "payslip.send"
  | "salary_structure.read" | "salary_structure.create" | "salary_structure.update" | "salary_structure.delete"
  | "salary_rule.read" | "salary_rule.create" | "salary_rule.update" | "salary_rule.delete"
  | "reports.read"
  | "users.read" | "users.create" | "users.update" | "users.delete"
  | "roles.read" | "roles.update"
  | "settings.read" | "settings.update";

const allPermissions: Permission[] = [
  "dashboard.read", "employee.read", "employee.create", "employee.update", "employee.delete",
  "attendance.read", "attendance.create", "attendance.update", "attendance.delete",
  "contract.read", "contract.create", "contract.update", "contract.delete",
  "schedule.read", "schedule.create", "schedule.update", "schedule.delete",
  "timeoff.read", "timeoff.create", "timeoff.update", "timeoff.delete", "timeoff.approve", "timeoff.refuse",
  "payrun.read", "payrun.create", "payrun.update", "payrun.delete", "payrun.compute", "payrun.validate", "payrun.mark_paid",
  "payslip.read", "payslip.create", "payslip.update", "payslip.delete", "payslip.print", "payslip.send",
  "salary_structure.read", "salary_structure.create", "salary_structure.update", "salary_structure.delete",
  "salary_rule.read", "salary_rule.create", "salary_rule.update", "salary_rule.delete",
  "reports.read", "users.read", "users.create", "users.update", "users.delete",
  "roles.read", "roles.update", "settings.read", "settings.update",
];

const hrPermissions: Permission[] = [
  "dashboard.read", "employee.read", "employee.create", "employee.update", "employee.delete",
  "attendance.read", "attendance.create", "attendance.update", "attendance.delete",
  "contract.read", "contract.create", "contract.update", "contract.delete",
  "schedule.read", "schedule.create", "schedule.update", "schedule.delete",
  "timeoff.read", "timeoff.create", "timeoff.update", "timeoff.delete", "timeoff.approve", "timeoff.refuse",
  "reports.read",
];

const payrollUserPermissions: Permission[] = [
  "payrun.read", "payrun.create", "payrun.update",
  "payslip.read", "payslip.create", "payslip.update",
  "salary_structure.read", "salary_rule.read",
];

export const defaultRolePermissions: Record<Role, Permission[]> = {
  EMPLOYEE: [
    "dashboard.read", "employee.read", "attendance.read", "attendance.create",
    "timeoff.read", "timeoff.create", "payslip.read",
  ],
  HR_MANAGER: hrPermissions,
  HR_PAYROLL_USER: [...hrPermissions, ...payrollUserPermissions],
  HR_PAYROLL_MANAGER: [
    ...hrPermissions, ...payrollUserPermissions,
    "payrun.delete", "payrun.compute", "payrun.validate", "payrun.mark_paid",
    "payslip.delete", "payslip.print", "payslip.send",
    "salary_structure.create", "salary_structure.update", "salary_structure.delete",
    "salary_rule.create", "salary_rule.update", "salary_rule.delete",
  ],
  ADMIN: allPermissions,
};

export const rolePermissions: Record<Role, Permission[]> = {
  EMPLOYEE: [...defaultRolePermissions.EMPLOYEE],
  HR_MANAGER: [...defaultRolePermissions.HR_MANAGER],
  HR_PAYROLL_USER: [...defaultRolePermissions.HR_PAYROLL_USER],
  HR_PAYROLL_MANAGER: [...defaultRolePermissions.HR_PAYROLL_MANAGER],
  ADMIN: [...defaultRolePermissions.ADMIN],
};

export function setRolePermissions(role: Role, permissions: Permission[]) {
  rolePermissions[role] = [...permissions];
}

export function resetRolePermissionsToDefault(role: Role) {
  rolePermissions[role] = [...defaultRolePermissions[role]];
}

export const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Employee",
  HR_MANAGER: "HR Manager",
  HR_PAYROLL_USER: "HR Payroll User",
  HR_PAYROLL_MANAGER: "HR Payroll Manager",
  ADMIN: "Admin",
};

export const roleDescriptions: Record<Role, string> = {
  EMPLOYEE: "Self-service access to view personal profile, track attendance, submit leave requests, and download payslips.",
  HR_MANAGER: "Core people operations, managing employees, contracts, working schedules, attendance records, and leave allocations/approvals.",
  HR_PAYROLL_USER: "HR operations combined with operational payroll capabilities to generate and review payruns and payslips.",
  HR_PAYROLL_MANAGER: "Complete HR and payroll authority, including calculating payruns, validation, payment release, and salary rule architecture.",
  ADMIN: "Full unrestricted access across all modules, user administration, role & permission control, and workspace configurations.",
};

export interface PermissionModuleGroup {
  module: string;
  permissions: {
    key: Permission;
    action: "read" | "create" | "update" | "delete" | "approve" | "refuse" | "compute" | "validate" | "mark_paid" | "print" | "send";
    label: string;
  }[];
}

export const permissionModules: PermissionModuleGroup[] = [
  {
    module: "Employees",
    permissions: [
      { key: "employee.read", action: "read", label: "Read" },
      { key: "employee.create", action: "create", label: "Create" },
      { key: "employee.update", action: "update", label: "Update" },
      { key: "employee.delete", action: "delete", label: "Delete" },
    ],
  },
  {
    module: "Contracts",
    permissions: [
      { key: "contract.read", action: "read", label: "Read" },
      { key: "contract.create", action: "create", label: "Create" },
      { key: "contract.update", action: "update", label: "Update" },
      { key: "contract.delete", action: "delete", label: "Delete" },
    ],
  },
  {
    module: "Schedules",
    permissions: [
      { key: "schedule.read", action: "read", label: "Read" },
      { key: "schedule.create", action: "create", label: "Create" },
      { key: "schedule.update", action: "update", label: "Update" },
      { key: "schedule.delete", action: "delete", label: "Delete" },
    ],
  },
  {
    module: "Attendance",
    permissions: [
      { key: "attendance.read", action: "read", label: "Read" },
      { key: "attendance.create", action: "create", label: "Create" },
      { key: "attendance.update", action: "update", label: "Update" },
      { key: "attendance.delete", action: "delete", label: "Delete" },
    ],
  },
  {
    module: "Time Off",
    permissions: [
      { key: "timeoff.read", action: "read", label: "Read" },
      { key: "timeoff.create", action: "create", label: "Create" },
      { key: "timeoff.update", action: "update", label: "Update" },
      { key: "timeoff.delete", action: "delete", label: "Delete" },
      { key: "timeoff.approve", action: "approve", label: "Approve" },
      { key: "timeoff.refuse", action: "refuse", label: "Refuse" },
    ],
  },
  {
    module: "Payruns",
    permissions: [
      { key: "payrun.read", action: "read", label: "Read" },
      { key: "payrun.create", action: "create", label: "Create" },
      { key: "payrun.update", action: "update", label: "Update" },
      { key: "payrun.delete", action: "delete", label: "Delete" },
      { key: "payrun.compute", action: "compute", label: "Compute" },
      { key: "payrun.validate", action: "validate", label: "Validate" },
      { key: "payrun.mark_paid", action: "mark_paid", label: "Mark Paid" },
    ],
  },
  {
    module: "Payslips",
    permissions: [
      { key: "payslip.read", action: "read", label: "Read" },
      { key: "payslip.create", action: "create", label: "Create" },
      { key: "payslip.update", action: "update", label: "Update" },
      { key: "payslip.delete", action: "delete", label: "Delete" },
      { key: "payslip.print", action: "print", label: "Print" },
      { key: "payslip.send", action: "send", label: "Send" },
    ],
  },
  {
    module: "Salary Structures",
    permissions: [
      { key: "salary_structure.read", action: "read", label: "Read" },
      { key: "salary_structure.create", action: "create", label: "Create" },
      { key: "salary_structure.update", action: "update", label: "Update" },
      { key: "salary_structure.delete", action: "delete", label: "Delete" },
    ],
  },
  {
    module: "Salary Rules",
    permissions: [
      { key: "salary_rule.read", action: "read", label: "Read" },
      { key: "salary_rule.create", action: "create", label: "Create" },
      { key: "salary_rule.update", action: "update", label: "Update" },
      { key: "salary_rule.delete", action: "delete", label: "Delete" },
    ],
  },
  {
    module: "Reports",
    permissions: [
      { key: "reports.read", action: "read", label: "Read" },
    ],
  },
  {
    module: "Users",
    permissions: [
      { key: "users.read", action: "read", label: "Read" },
      { key: "users.create", action: "create", label: "Create" },
      { key: "users.update", action: "update", label: "Update" },
      { key: "users.delete", action: "delete", label: "Delete" },
    ],
  },
  {
    module: "Roles",
    permissions: [
      { key: "roles.read", action: "read", label: "Read" },
      { key: "roles.update", action: "update", label: "Update" },
    ],
  },
  {
    module: "Settings",
    permissions: [
      { key: "settings.read", action: "read", label: "Read" },
      { key: "settings.update", action: "update", label: "Update" },
    ],
  },
];

export function canAccess(role: Role, permission: Permission) {
  return (rolePermissions[role] ?? []).includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]) {
  return permissions.some((permission) => canAccess(role, permission));
}

export type NavItem = { label: string; href: string; icon: LucideIcon; permission: Permission };
export type NavSection = { label: string; items: NavItem[] };

export const navigation: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.read" }],
  },
  {
    label: "HR & Operations",
    items: [
      { label: "Employees", href: "/employees", icon: Users, permission: "employee.read" },
      { label: "Contracts", href: "/contracts", icon: FileText, permission: "contract.read" },
      { label: "Attendance", href: "/attendance", icon: ClipboardList, permission: "attendance.read" },
      { label: "Working Schedules", href: "/schedules", icon: CalendarDays, permission: "schedule.read" },
    ],
  },
  {
    label: "Time Off",
    items: [
      { label: "Overview", href: "/time-off", icon: CalendarDays, permission: "timeoff.read" },
      { label: "Requests", href: "/time-off/requests", icon: ListFilter, permission: "timeoff.read" },
      { label: "Allocations", href: "/time-off/allocations", icon: Layers, permission: "timeoff.read" },
      { label: "Time Off Types", href: "/time-off/types", icon: ShieldCheck, permission: "timeoff.approve" },
    ],
  },
  {
    label: "Payroll",
    items: [
      { label: "Payruns", href: "/payroll", icon: WalletCards, permission: "payrun.read" },
      { label: "Payslips", href: "/payslips", icon: CircleDollarSign, permission: "payslip.read" },
      { label: "Salary Structures", href: "/salary-structures", icon: Building2, permission: "salary_structure.read" },
      { label: "Salary Rules", href: "/salary-rules", icon: LockKeyhole, permission: "salary_rule.read" },
    ],
  },
  {
    label: "Analytics",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.read" }],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/users", icon: Users, permission: "users.read" },
      { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck, permission: "roles.read" },
      { label: "Settings", href: "/settings", icon: Settings, permission: "settings.read" },
    ],
  },
];

export function visibleNavigation(role: Role) {
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(role, item.permission)),
    }))
    .filter((section) => section.items.length > 0);
}

const routePermissions: Record<string, Permission> = {
  "/dashboard": "dashboard.read",
  "/employees": "employee.read",
  "/contracts": "contract.read",
  "/schedules": "schedule.read",
  "/attendance": "attendance.read",
  "/time-off": "timeoff.read",
  "/payroll": "payrun.read",
  "/payroll/new": "payrun.create",
  "/payslips": "payslip.read",
  "/salary-structures": "salary_structure.read",
  "/salary-rules": "salary_rule.read",
  "/reports": "reports.read",
  "/users": "users.read",
  "/roles": "roles.read",
  "/settings": "settings.read",
};

export function permissionForPath(pathname: string) {
  if (routePermissions[pathname]) return routePermissions[pathname];
  if (pathname === "/employees/new") return "employee.create";
  if (pathname.startsWith("/employees/") && pathname.endsWith("/edit")) return "employee.update";
  if (pathname.startsWith("/employees/") && pathname.includes("/contracts")) return "contract.read";
  if (pathname.startsWith("/employees/") && pathname.includes("/attendance")) return "attendance.read";
  if (pathname.startsWith("/employees/") && pathname.includes("/time-off")) return "timeoff.read";
  if (pathname.startsWith("/employees/") && pathname.includes("/allocations")) return "timeoff.read";
  if (pathname.startsWith("/employees/")) return "employee.read";
  if (pathname === "/contracts/new") return "contract.create";
  if (pathname.startsWith("/contracts/") && pathname.endsWith("/edit")) return "contract.update";
  if (pathname.startsWith("/contracts/")) return "contract.read";
  if (pathname === "/schedules/new") return "schedule.create";
  if (pathname.startsWith("/schedules/") && pathname.endsWith("/edit")) return "schedule.update";
  if (pathname.startsWith("/schedules/")) return "schedule.read";
  if (pathname === "/attendance/new") return "attendance.create";
  if (pathname.startsWith("/attendance/") && pathname.endsWith("/edit")) return "attendance.update";
  if (pathname.startsWith("/attendance/")) return "attendance.read";
  if (pathname.startsWith("/time-off/types")) return "timeoff.approve";
  if (pathname === "/time-off/allocations/new") return "timeoff.update";
  if (pathname.startsWith("/time-off/allocations/") && pathname.endsWith("/edit")) return "timeoff.update";
  if (pathname.startsWith("/time-off/allocations")) return "timeoff.read";
  if (pathname === "/time-off/requests/new") return "timeoff.create";
  if (pathname.startsWith("/time-off/requests/") && pathname.endsWith("/edit")) return "timeoff.create";
  if (pathname.startsWith("/time-off/requests")) return "timeoff.read";
  if (pathname === "/salary-structures/new") return "salary_structure.create";
  if (pathname.startsWith("/salary-structures/") && pathname.endsWith("/edit")) return "salary_structure.update";
  if (pathname.startsWith("/salary-structures/")) return "salary_structure.read";
  if (pathname === "/salary-rules/new") return "salary_rule.create";
  if (pathname.startsWith("/salary-rules/") && pathname.endsWith("/edit")) return "salary_rule.update";
  if (pathname.startsWith("/salary-rules/")) return "salary_rule.read";
  if (pathname.startsWith("/payslips/")) return "payslip.read";
  if (pathname === "/users/new") return "users.create";
  if (pathname.startsWith("/users/") && pathname.endsWith("/edit")) return "users.update";
  if (pathname.startsWith("/users/")) return "users.read";
  if (pathname.startsWith("/roles/")) return "roles.read";
  if (pathname.startsWith("/settings")) return "settings.read";
  return pathname.startsWith("/payroll/") ? "payrun.read" : undefined;
}
