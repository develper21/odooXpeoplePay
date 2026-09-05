export const roles = ["EMPLOYEE", "HR_MANAGER", "HR_PAYROLL_USER", "HR_PAYROLL_MANAGER", "ADMIN"] as const;
export type Role = (typeof roles)[number];
export type AuthUser = { id: string; name: string; email: string; role: Role; initials: string; employeeId?: string };
export type LoginCredentials = { email: string; password: string };
export type AuthState = { user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean };
