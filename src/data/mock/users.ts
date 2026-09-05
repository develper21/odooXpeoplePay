import type { User } from "@/types/domain";
export const mockUsers: User[] = [
  { id: "usr-001", name: "Alex Davis", email: "alex.davis@northstar.io", role: "ADMIN", status: "ACTIVE" },
  { id: "usr-002", name: "Rina Shah", email: "rina.shah@northstar.io", role: "HR_PAYROLL_USER", status: "ACTIVE" },
  { id: "usr-003", name: "Morgan Lee", email: "morgan.lee@northstar.io", role: "HR_MANAGER", status: "INVITED" },
];
