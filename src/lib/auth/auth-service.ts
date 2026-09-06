import { mockAuthUsers } from "@/data/mock/auth-users";
import { dataMode } from "@/lib/data-mode";
import { apiClient } from "@/lib/api/client";
import type { AuthUser, LoginCredentials } from "@/lib/auth/auth-types";

const apiDevAccounts: AuthUser[] = [
  { id: "auth-admin", name: "Arjun Mehta", email: "arjun.mehta@northstar.io", role: "ADMIN", initials: "AM", employeeId: "emp-010" },
  { id: "auth-hr-manager", name: "Priya Shah", email: "priya.shah@northstar.io", role: "HR_MANAGER", initials: "PS", employeeId: "emp-003" },
  { id: "auth-payroll-manager", name: "Neha Jain", email: "neha.jain@northstar.io", role: "HR_PAYROLL_MANAGER", initials: "NJ", employeeId: "emp-009" },
  { id: "auth-payroll-user", name: "Amit Patel", email: "amit.patel@northstar.io", role: "HR_PAYROLL_USER", initials: "AP", employeeId: "emp-012" },
  { id: "auth-employee", name: "Rahul Sharma", email: "rahul.sharma@northstar.io", role: "EMPLOYEE", initials: "RS", employeeId: "emp-001" },
];

export const authService = {
  getDevelopmentAccounts() { return apiDevAccounts; },
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    if (dataMode === "api") {
      const rawUser = await apiClient<any>("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
      const user = rawUser?.user ?? rawUser;
      const firstName = user.firstName ?? user.first_name ?? "";
      const lastName = user.lastName ?? user.last_name ?? "";
      const fullName = user.name || `${firstName} ${lastName}`.trim() || user.email;
      const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || fullName.slice(0, 2).toUpperCase();
      const role = (user.roleCode || user.role_code || user.role || "EMPLOYEE").toUpperCase() as any;
      const employeeId = user.employeeId ? String(user.employeeId) : (user.employee_id ? String(user.employee_id) : undefined);

      return {
        id: String(user.id),
        name: fullName,
        email: user.email,
        role,
        initials,
        employeeId,
      };
    }
    const user = mockAuthUsers.find((candidate) => candidate.email.toLowerCase() === credentials.email.toLowerCase());
    if (!user || credentials.password.length < 6) throw new Error("Invalid mock account or password.");
    return user;
  },
  async me(): Promise<AuthUser | null> {
    if (dataMode === "api") {
      try {
        const rawUser = await apiClient<any>("/auth/me");
        const user = rawUser?.user ?? rawUser;
        if (!user) return null;
        const firstName = user.firstName ?? user.first_name ?? "";
        const lastName = user.lastName ?? user.last_name ?? "";
        const fullName = user.name || `${firstName} ${lastName}`.trim() || user.email;
        const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || fullName.slice(0, 2).toUpperCase();
        const role = (user.roleCode || user.role_code || user.role || "EMPLOYEE").toUpperCase() as any;
        const employeeId = user.employeeId ? String(user.employeeId) : (user.employee_id ? String(user.employee_id) : undefined);

        return {
          id: String(user.id),
          name: fullName,
          email: user.email,
          role,
          initials,
          employeeId,
        };
      } catch {
        return null;
      }
    }
    return null;
  },
  async logout() { if (dataMode === "api") await apiClient<void>("/auth/logout", { method: "POST" }); },
};
