import { apiClient } from "@/lib/api/client";
import { dataMode } from "@/lib/data-mode";
import { mockDashboard } from "@/data/mock";
import { createMock, deleteMock, listMock, updateMock } from "@/lib/services/mock-store";
import { createResourceService } from "@/lib/services/resource-service";
import type { AttendanceRecord, Contract, DashboardData, Employee, Payrun, Payslip, SalaryRule, SalaryStructure, TimeOffAllocation, TimeOffRequest, TimeOffType, User, WorkingSchedule } from "@/types/domain";

export const employeeService = createResourceService<Employee>("employees", "/employees");
export const contractService = { ...createResourceService<Contract>("contracts", "/contracts"), listByEmployee: async (employeeId: string) => dataMode === "api" ? apiClient<Contract[]>(`/contracts?employeeId=${employeeId}`) : (listMock("contracts") as Contract[]).filter((contract) => contract.employeeId === employeeId) };
export const scheduleService = createResourceService<WorkingSchedule>("schedules", "/schedules");
export const attendanceService = createResourceService<AttendanceRecord>("attendance", "/attendance");
export const allocationService = createResourceService<TimeOffAllocation>("allocations", "/time-off/allocations");
export const timeOffService = {
  ...createResourceService<TimeOffRequest>("timeOffRequests", "/time-off/requests"),
  remove: async (id: string) => {
    if (dataMode === "api") {
      return apiClient<void>(`/time-off/requests/${id}`, { method: "DELETE" });
    }
    const requests = listMock("timeOffRequests");
    const request = requests.find((r) => r.id === id);
    if (request && request.status === "APPROVED") {
      const types = listMock("timeOffTypes");
      const leaveType = types.find((t) => t.id === request.typeId || t.name.toLowerCase() === request.type.toLowerCase());
      if (!leaveType || leaveType.allocationRequired) {
        const allocations = listMock("allocations");
        const alloc = allocations.find(
          (a) =>
            a.id === request.allocationId ||
            (a.employeeId === request.employeeId &&
              (a.typeId === request.typeId || a.type.toLowerCase() === request.type.toLowerCase()))
        );
        if (alloc) {
          const newUsed = Math.max(0, alloc.usedDays - request.days);
          const newRemaining = alloc.allocatedDays - newUsed;
          updateMock("allocations", alloc.id, { usedDays: newUsed, remainingDays: newRemaining });
        }
      }
    }
    return deleteMock("timeOffRequests", id);
  },
};
export const timeOffTypeService = createResourceService<TimeOffType>("timeOffTypes", "/time-off/types");
export const salaryStructureService = createResourceService<SalaryStructure>("salaryStructures", "/salary-structures");
export const salaryRuleService = createResourceService<SalaryRule>("salaryRules", "/salary-rules");
export const payrunService = createResourceService<Payrun>("payruns", "/payruns");
export const payslipService = createResourceService<Payslip>("payslips", "/payslips");
export const userService = createResourceService<User>("users", "/users");

export const dashboardService = {
  get: async (): Promise<DashboardData> => dataMode === "api" ? apiClient<DashboardData>("/dashboard") : mockDashboard,
};

export const timeOffWorkflow = {
  approve: async (id: string) => {
    if (dataMode === "api") {
      return apiClient<TimeOffRequest>(`/time-off/requests/${id}/approve`, { method: "POST" });
    }
    const requests = listMock("timeOffRequests");
    const request = requests.find((r) => r.id === id);
    if (!request) throw new Error("Request not found");
    if (request.status === "APPROVED") {
      // Prevent duplicate approval balance consumption
      return request;
    }
    if (request.status === "REFUSED") {
      throw new Error("Refused request cannot be approved directly.");
    }
    
    // Check if leave type requires allocation
    const types = listMock("timeOffTypes");
    const leaveType = types.find((t) => t.id === request.typeId || t.name.toLowerCase() === request.type.toLowerCase());
    const requiresAllocation = leaveType ? leaveType.allocationRequired : true;

    if (requiresAllocation) {
      // Deduct from allocation if applicable
      const allocations = listMock("allocations");
      const alloc = allocations.find(
        (a) =>
          a.id === request.allocationId ||
          (a.employeeId === request.employeeId &&
            (a.typeId === request.typeId || a.type.toLowerCase() === request.type.toLowerCase()))
      );

      if (alloc) {
        const newUsed = alloc.usedDays + request.days;
        const newRemaining = Math.max(0, alloc.allocatedDays - newUsed);
        updateMock("allocations", alloc.id, { usedDays: newUsed, remainingDays: newRemaining });
      }
    }

    return updateMock("timeOffRequests", id, { status: "APPROVED" });
  },
  refuse: async (id: string) => {
    if (dataMode === "api") {
      return apiClient<TimeOffRequest>(`/time-off/requests/${id}/refuse`, { method: "POST" });
    }
    const requests = listMock("timeOffRequests");
    const request = requests.find((r) => r.id === id);
    if (!request) throw new Error("Request not found");
    if (request.status === "REFUSED") {
      return request;
    }
    if (request.status === "APPROVED") {
      // If refusing an approved request, restore allocation
      const types = listMock("timeOffTypes");
      const leaveType = types.find((t) => t.id === request.typeId || t.name.toLowerCase() === request.type.toLowerCase());
      if (!leaveType || leaveType.allocationRequired) {
        const allocations = listMock("allocations");
        const alloc = allocations.find(
          (a) =>
            a.id === request.allocationId ||
            (a.employeeId === request.employeeId &&
              (a.typeId === request.typeId || a.type.toLowerCase() === request.type.toLowerCase()))
        );
        if (alloc) {
          const newUsed = Math.max(0, alloc.usedDays - request.days);
          const newRemaining = alloc.allocatedDays - newUsed;
          updateMock("allocations", alloc.id, { usedDays: newUsed, remainingDays: newRemaining });
        }
      }
    }
    return updateMock("timeOffRequests", id, { status: "REFUSED" });
  },
};

export const payrunWorkflow = {
  create: async (input: Omit<Payrun, "id">) => payrunService.create(input),
  compute: async (id: string) => dataMode === "api" ? apiClient<Payrun>(`/payruns/${id}/compute`, { method: "POST" }) : updateMock("payruns", id, { status: "PROCESSING" }),
  validate: async (id: string) => dataMode === "api" ? apiClient<Payrun>(`/payruns/${id}/validate`, { method: "POST" }) : updateMock("payruns", id, { status: "VALIDATED" }),
  markPaid: async (id: string) => dataMode === "api" ? apiClient<Payrun>(`/payruns/${id}/paid`, { method: "POST" }) : updateMock("payruns", id, { status: "PAID" }),
  sendPayslips: async (id: string) => dataMode === "api" ? apiClient<void>(`/payruns/${id}/send-payslips`, { method: "POST" }) : undefined,
};
