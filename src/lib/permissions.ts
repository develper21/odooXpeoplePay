import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, CalendarDays, CircleDollarSign, ClipboardList, FileText, LayoutDashboard, LockKeyhole, Settings, ShieldCheck, UserRound, Users, WalletCards } from "lucide-react";
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
  | "reports.read" | "users.read" | "users.create" | "users.update" | "users.delete" | "roles.read" | "roles.update" | "settings.read" | "settings.update";

const allPermissions: Permission[] = [
  "dashboard.read", "employee.read", "employee.create", "employee.update", "employee.delete", "attendance.read", "attendance.create", "attendance.update", "attendance.delete", "contract.read", "contract.create", "contract.update", "contract.delete", "schedule.read", "schedule.create", "schedule.update", "schedule.delete", "timeoff.read", "timeoff.create", "timeoff.update", "timeoff.delete", "timeoff.approve", "timeoff.refuse", "payrun.read", "payrun.create", "payrun.update", "payrun.delete", "payrun.compute", "payrun.validate", "payrun.mark_paid", "payslip.read", "payslip.create", "payslip.update", "payslip.delete", "payslip.print", "payslip.send", "salary_structure.read", "salary_structure.create", "salary_structure.update", "salary_structure.delete", "salary_rule.read", "salary_rule.create", "salary_rule.update", "salary_rule.delete", "reports.read", "users.read", "users.create", "users.update", "users.delete", "roles.read", "roles.update", "settings.read", "settings.update",
];

const hrPermissions: Permission[] = ["dashboard.read", "employee.read", "employee.create", "employee.update", "employee.delete", "attendance.read", "attendance.create", "attendance.update", "attendance.delete", "contract.read", "contract.create", "contract.update", "contract.delete", "schedule.read", "schedule.create", "schedule.update", "schedule.delete", "timeoff.read", "timeoff.create", "timeoff.update", "timeoff.delete", "timeoff.approve", "timeoff.refuse", "reports.read"];
const payrollUserPermissions: Permission[] = ["payrun.read", "payrun.create", "payrun.update", "payslip.read", "payslip.create", "payslip.update", "salary_structure.read", "salary_rule.read"];

export const rolePermissions: Record<Role, Permission[]> = {
  EMPLOYEE: ["dashboard.read", "employee.read", "attendance.read", "attendance.create", "timeoff.read", "timeoff.create"],
  HR_MANAGER: hrPermissions,
  HR_PAYROLL_USER: [...hrPermissions, ...payrollUserPermissions],
  HR_PAYROLL_MANAGER: [...hrPermissions, ...payrollUserPermissions, "payrun.delete", "payrun.compute", "payrun.validate", "payrun.mark_paid", "payslip.delete", "payslip.print", "payslip.send", "salary_structure.create", "salary_structure.update", "salary_structure.delete", "salary_rule.create", "salary_rule.update", "salary_rule.delete"],
  ADMIN: allPermissions,
};

export const roleLabels: Record<Role, string> = { EMPLOYEE: "Employee", HR_MANAGER: "HR Manager", HR_PAYROLL_USER: "HR Payroll User", HR_PAYROLL_MANAGER: "HR Payroll Manager", ADMIN: "Admin" };
export function canAccess(role: Role, permission: Permission) { return rolePermissions[role].includes(permission); }
export function hasAnyPermission(role: Role, permissions: Permission[]) { return permissions.some((permission) => canAccess(role, permission)); }

export type NavItem = { label: string; href: string; icon: LucideIcon; permission: Permission };
export type NavSection = { label: string; items: NavItem[] };
export const navigation: NavSection[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.read" }] },
  { label: "My workspace", items: [{ label: "My Profile", href: "/employees", icon: UserRound, permission: "employee.read" }, { label: "My Attendance", href: "/attendance", icon: ClipboardList, permission: "attendance.read" }, { label: "My Time Off", href: "/time-off", icon: CalendarDays, permission: "timeoff.read" }] },
  { label: "HR", items: [{ label: "Employees", href: "/employees", icon: Users, permission: "employee.create" }, { label: "Contracts", href: "/contracts", icon: FileText, permission: "contract.read" }, { label: "Working Schedules", href: "/schedules", icon: CalendarDays, permission: "schedule.read" }, { label: "Attendance", href: "/attendance", icon: ClipboardList, permission: "attendance.update" }, { label: "Time Off", href: "/time-off", icon: CalendarDays, permission: "timeoff.approve" }] },
  { label: "Payroll", items: [{ label: "Payruns", href: "/payroll", icon: WalletCards, permission: "payrun.read" }, { label: "Payslips", href: "/payslips", icon: CircleDollarSign, permission: "payslip.read" }, { label: "Salary Structures", href: "/salary-structures", icon: Building2, permission: "salary_structure.read" }, { label: "Salary Rules", href: "/salary-rules", icon: LockKeyhole, permission: "salary_rule.read" }] },
  { label: "Analytics", items: [{ label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.read" }] },
  { label: "Administration", items: [{ label: "Users", href: "/users", icon: Users, permission: "users.read" }, { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck, permission: "roles.read" }, { label: "Settings", href: "/settings", icon: Settings, permission: "settings.read" }] },
];

export function visibleNavigation(role: Role) { return navigation.map((section) => ({ ...section, items: section.items.filter((item) => canAccess(role, item.permission)) })).filter((section) => section.items.length > 0); }

const routePermissions: Record<string, Permission> = { "/dashboard": "dashboard.read", "/employees": "employee.read", "/contracts": "contract.read", "/schedules": "schedule.read", "/attendance": "attendance.read", "/time-off": "timeoff.read", "/payroll": "payrun.read", "/payroll/new": "payrun.create", "/payslips": "payslip.read", "/salary-structures": "salary_structure.read", "/salary-rules": "salary_rule.read", "/reports": "reports.read", "/users": "users.read", "/roles": "roles.read", "/settings": "settings.read" };
export function permissionForPath(pathname: string) { if (routePermissions[pathname]) return routePermissions[pathname]; if (pathname === "/employees/new") return "employee.create"; if (pathname.startsWith("/employees/") && pathname.endsWith("/edit")) return "employee.update"; if (pathname.startsWith("/employees/") && pathname.includes("/contracts")) return "contract.read"; if (pathname.startsWith("/employees/") && pathname.includes("/attendance")) return "attendance.read"; if (pathname.startsWith("/employees/") && pathname.includes("/time-off")) return "timeoff.read"; if (pathname.startsWith("/employees/") && pathname.includes("/allocations")) return "timeoff.read"; if (pathname.startsWith("/employees/")) return "employee.read"; if (pathname === "/contracts/new") return "contract.create"; if (pathname.startsWith("/contracts/") && pathname.endsWith("/edit")) return "contract.update"; if (pathname.startsWith("/contracts/")) return "contract.read"; if (pathname === "/schedules/new") return "schedule.create"; if (pathname.startsWith("/schedules/") && pathname.endsWith("/edit")) return "schedule.update"; if (pathname.startsWith("/schedules/")) return "schedule.read"; if (pathname === "/attendance/new") return "attendance.create"; if (pathname.startsWith("/attendance/") && pathname.endsWith("/edit")) return "attendance.update"; if (pathname.startsWith("/attendance/")) return "attendance.read"; return pathname.startsWith("/payroll/") ? "payrun.read" : undefined; }
