import { apiClient } from "@/lib/api/client";
import { dataMode } from "@/lib/data-mode";
import { mockDashboard } from "@/data/mock";
import { createMock, deleteMock, listMock, updateMock } from "@/lib/services/mock-store";
import { createResourceService } from "@/lib/services/resource-service";
import { calculateSalary, type SalaryCalculationContext, type SalaryCalculationResult } from "@/lib/salary-calculator";
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
export const salaryStructureService = {
  ...createResourceService<SalaryStructure>("salaryStructures", "/salary-structures"),
  remove: async (id: string) => {
    if (dataMode === "api") {
      return apiClient<void>(`/salary-structures/${id}`, { method: "DELETE" });
    }
    const contracts = listMock("contracts");
    const assignedContracts = contracts.filter((c) => c.salaryStructureId === id);
    if (assignedContracts.length > 0) {
      throw new Error(`Cannot delete salary structure: it is referenced by ${assignedContracts.length} contract(s) (e.g. ${assignedContracts[0].reference}). Reassign them before deleting.`);
    }
    return deleteMock("salaryStructures", id);
  },
};

export const salaryRuleService = {
  ...createResourceService<SalaryRule>("salaryRules", "/salary-rules"),
  create: async (input: Omit<SalaryRule, "id">) => {
    if (dataMode === "api") {
      return apiClient<SalaryRule>("/salary-rules", { method: "POST", body: JSON.stringify(input) });
    }
    const rules = listMock("salaryRules");
    const codeUpper = input.code.trim().toUpperCase();
    if (rules.some((r) => r.code.toUpperCase() === codeUpper)) {
      throw new Error(`Salary rule code "${codeUpper}" already exists. Rule codes must be unique.`);
    }
    const id = `sr-${Date.now().toString(36)}`;
    return createMock("salaryRules", { ...input, id, code: codeUpper });
  },
  update: async (id: string, input: Partial<SalaryRule>) => {
    if (dataMode === "api") {
      return apiClient<SalaryRule>(`/salary-rules/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    }
    if (input.code) {
      const codeUpper = input.code.trim().toUpperCase();
      const rules = listMock("salaryRules");
      if (rules.some((r) => r.id !== id && r.code.toUpperCase() === codeUpper)) {
        throw new Error(`Salary rule code "${codeUpper}" already exists on another rule.`);
      }
      input.code = codeUpper;
    }
    return updateMock("salaryRules", id, input);
  },
  remove: async (id: string) => {
    if (dataMode === "api") {
      return apiClient<void>(`/salary-rules/${id}`, { method: "DELETE" });
    }
    const structures = listMock("salaryStructures");
    const referencingStructures = structures.filter((s) => s.ruleIds?.includes(id));
    if (referencingStructures.length > 0) {
      throw new Error(`Cannot delete salary rule: it is currently used in "${referencingStructures[0].name}". Remove it from the structure first.`);
    }
    return deleteMock("salaryRules", id);
  },
};

export const salaryCalculationService = {
  calculate: async (rules: SalaryRule[], context?: SalaryCalculationContext): Promise<SalaryCalculationResult> => {
    return calculateSalary(rules, context);
  },
  calculateForStructure: async (structureId: string, context?: SalaryCalculationContext): Promise<SalaryCalculationResult> => {
    if (dataMode === "api") {
      return apiClient<SalaryCalculationResult>(`/salary-structures/${structureId}/calculate`, {
        method: "POST",
        body: JSON.stringify(context || {}),
      });
    }
    const structures = listMock("salaryStructures");
    const structure = structures.find((s) => s.id === structureId);
    if (!structure) {
      throw new Error(`Salary structure ${structureId} not found.`);
    }
    const allRules = listMock("salaryRules");
    const structureRules = (structure.ruleIds || [])
      .map((rId) => allRules.find((r) => r.id === rId))
      .filter((r): r is SalaryRule => Boolean(r));

    return calculateSalary(structureRules, context);
  },
};
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

import {
  computePayrun,
  validatePayrun,
  markPayrunPaid,
  sendPayrunPayslips,
  findApplicableContract,
  computeWorkedDays,
} from "@/lib/services/payroll-service";

export const payrunWorkflow = {
  create: async (input: Omit<Payrun, "id">) => payrunService.create(input),
  compute: computePayrun,
  validate: validatePayrun,
  markPaid: markPayrunPaid,
  sendPayslips: sendPayrunPayslips,
};

export {
  computePayrun,
  validatePayrun,
  markPayrunPaid,
  sendPayrunPayslips,
  findApplicableContract,
  computeWorkedDays,
};
