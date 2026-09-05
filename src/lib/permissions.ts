import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, CalendarDays, CircleDollarSign, ClipboardList, FileText, LayoutDashboard, LockKeyhole, Settings, ShieldCheck, Users, WalletCards } from "lucide-react";

export type Role = "EMPLOYEE" | "HR_MANAGER" | "HR_PAYROLL_USER" | "HR_PAYROLL_MANAGER" | "ADMIN";
export type Permission = "dashboard:read" | "hr:read" | "payroll:read" | "analytics:read" | "admin:read";

export const rolePermissions: Record<Role, Permission[]> = {
  EMPLOYEE: ["dashboard:read"],
  HR_MANAGER: ["dashboard:read", "hr:read", "analytics:read"],
  HR_PAYROLL_USER: ["dashboard:read", "hr:read", "payroll:read"],
  HR_PAYROLL_MANAGER: ["dashboard:read", "hr:read", "payroll:read", "analytics:read"],
  ADMIN: ["dashboard:read", "hr:read", "payroll:read", "analytics:read", "admin:read"],
};

export type NavItem = { label: string; href: string; icon: LucideIcon; permission: Permission };
export type NavSection = { label: string; items: NavItem[] };

export const navigation: NavSection[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:read" }] },
  { label: "HR", items: [
    { label: "Employees", href: "/employees", icon: Users, permission: "hr:read" },
    { label: "Contracts", href: "/contracts", icon: FileText, permission: "hr:read" },
    { label: "Working Schedules", href: "/schedules", icon: CalendarDays, permission: "hr:read" },
    { label: "Attendance", href: "/attendance", icon: ClipboardList, permission: "hr:read" },
    { label: "Time Off", href: "/time-off", icon: CalendarDays, permission: "hr:read" },
  ]},
  { label: "Payroll", items: [
    { label: "Payruns", href: "/payroll", icon: WalletCards, permission: "payroll:read" },
    { label: "Payslips", href: "/payslips", icon: CircleDollarSign, permission: "payroll:read" },
    { label: "Salary Structures", href: "/salary-structures", icon: Building2, permission: "payroll:read" },
    { label: "Salary Rules", href: "/salary-rules", icon: LockKeyhole, permission: "payroll:read" },
  ]},
  { label: "Analytics", items: [{ label: "Reports", href: "/reports", icon: BarChart3, permission: "analytics:read" }] },
  { label: "Administration", items: [
    { label: "Users", href: "/users", icon: Users, permission: "admin:read" },
    { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck, permission: "admin:read" },
    { label: "Settings", href: "/settings", icon: Settings, permission: "admin:read" },
  ]},
];

export function canAccess(role: Role, permission: Permission) { return rolePermissions[role].includes(permission); }
export function visibleNavigation(role: Role) { return navigation.map((section) => ({ ...section, items: section.items.filter((item) => canAccess(role, item.permission)) })).filter((section) => section.items.length > 0); }
