import type { AuthUser } from "@/lib/auth/auth-types";

export const mockAuthUsers: AuthUser[] = [
  { id: "auth-employee", name: "Rahul Sharma", email: "rahul.sharma@northstar.io", role: "EMPLOYEE", initials: "RS", employeeId: "emp-001" },
  { id: "auth-hr-manager", name: "Priya Shah", email: "priya.shah@northstar.io", role: "HR_MANAGER", initials: "PS" },
  { id: "auth-payroll-user", name: "Amit Patel", email: "amit.patel@northstar.io", role: "HR_PAYROLL_USER", initials: "AP" },
  { id: "auth-payroll-manager", name: "Neha Jain", email: "neha.jain@northstar.io", role: "HR_PAYROLL_MANAGER", initials: "NJ" },
  { id: "auth-admin", name: "Arjun Mehta", email: "arjun.mehta@northstar.io", role: "ADMIN", initials: "AM" },
];
