import { apiClient } from "@/lib/api/client";
import { dataMode } from "@/lib/data-mode";
import { mockDashboard } from "@/data/mock";
import { createMock, deleteMock, listMock, updateMock } from "@/lib/services/mock-store";
import { createResourceService } from "@/lib/services/resource-service";
import type { AttendanceRecord, Contract, DashboardData, Employee, Payrun, Payslip, SalaryRule, SalaryStructure, TimeOffAllocation, TimeOffRequest, User, WorkingSchedule } from "@/types/domain";

export const employeeService = createResourceService<Employee>("employees", "/employees");
export const contractService = { ...createResourceService<Contract>("contracts", "/contracts"), listByEmployee: async (employeeId: string) => dataMode === "api" ? apiClient<Contract[]>(`/contracts?employeeId=${employeeId}`) : (listMock("contracts") as Contract[]).filter((contract) => contract.employeeId === employeeId) };
export const scheduleService = createResourceService<WorkingSchedule>("schedules", "/schedules");
export const attendanceService = createResourceService<AttendanceRecord>("attendance", "/attendance");
export const allocationService = createResourceService<TimeOffAllocation>("allocations", "/time-off/allocations");
export const timeOffService = createResourceService<TimeOffRequest>("timeOffRequests", "/time-off/requests");
export const salaryStructureService = createResourceService<SalaryStructure>("salaryStructures", "/salary-structures");
export const salaryRuleService = createResourceService<SalaryRule>("salaryRules", "/salary-rules");
export const payrunService = createResourceService<Payrun>("payruns", "/payruns");
export const payslipService = createResourceService<Payslip>("payslips", "/payslips");
export const userService = createResourceService<User>("users", "/users");

export const dashboardService = {
  get: async (): Promise<DashboardData> => dataMode === "api" ? apiClient<DashboardData>("/dashboard") : mockDashboard,
};

export const timeOffWorkflow = {
  approve: async (id: string) => dataMode === "api" ? apiClient<TimeOffRequest>(`/time-off/requests/${id}/approve`, { method: "POST" }) : updateMock("timeOffRequests", id, { status: "APPROVED" }),
  refuse: async (id: string) => dataMode === "api" ? apiClient<TimeOffRequest>(`/time-off/requests/${id}/refuse`, { method: "POST" }) : updateMock("timeOffRequests", id, { status: "REFUSED" }),
};

export const payrunWorkflow = {
  create: async (input: Omit<Payrun, "id">) => payrunService.create(input),
  compute: async (id: string) => dataMode === "api" ? apiClient<Payrun>(`/payruns/${id}/compute`, { method: "POST" }) : updateMock("payruns", id, { status: "PROCESSING" }),
  validate: async (id: string) => dataMode === "api" ? apiClient<Payrun>(`/payruns/${id}/validate`, { method: "POST" }) : updateMock("payruns", id, { status: "VALIDATED" }),
  markPaid: async (id: string) => dataMode === "api" ? apiClient<Payrun>(`/payruns/${id}/paid`, { method: "POST" }) : updateMock("payruns", id, { status: "PAID" }),
  sendPayslips: async (id: string) => dataMode === "api" ? apiClient<void>(`/payruns/${id}/send-payslips`, { method: "POST" }) : undefined,
};
