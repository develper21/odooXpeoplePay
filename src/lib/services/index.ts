import { apiBlob, apiClient } from "@/lib/api/client";
import { dataMode } from "@/lib/data-mode";
import { createMock, deleteMock, listMock, updateMock } from "@/lib/services/mock-store";
import { createResourceService } from "@/lib/services/resource-service";
import { calculateSalary, type SalaryCalculationContext, type SalaryCalculationResult } from "@/lib/salary-calculator";
import type { AttendanceRecord, Contract, DashboardData, Employee, Payrun, Payslip, SalaryRule, SalaryStructure, TimeOffAllocation, TimeOffRequest, TimeOffType, User, WorkingSchedule } from "@/types/domain";

export const employeeService = createResourceService<Employee>("employees", "/employees");
export const contractService = { ...createResourceService<Contract>("contracts", "/contracts"), listByEmployee: async (employeeId: string) => dataMode === "api" ? apiClient<Contract[]>(`/contracts?employeeId=${employeeId}`) : (listMock("contracts") as Contract[]).filter((contract) => contract.employeeId === employeeId) };
export const scheduleService = createResourceService<WorkingSchedule>("schedules", "/schedules");
export const attendanceService = {
  ...createResourceService<AttendanceRecord>("attendance", "/attendance"),
  checkIn: async (employeeId?: string) => {
    if (dataMode === "api") {
      return apiClient<AttendanceRecord>("/attendance/check-in", { method: "POST" });
    }
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const records = listMock("attendance");
    const targetEmpId = employeeId || "emp-001";
    const existing = records.find((r) => r.employeeId === targetEmpId && r.date === today);
    if (existing) {
      return updateMock("attendance", existing.id, { checkIn: nowTime, status: "PRESENT" });
    }
    return createMock("attendance", {
      id: `att-${Date.now().toString(36)}`,
      employeeId: targetEmpId,
      date: today,
      checkIn: nowTime,
      status: "PRESENT",
      workedMinutes: 0,
      breakMinutes: 60,
    });
  },
  checkOut: async (employeeId?: string) => {
    if (dataMode === "api") {
      return apiClient<AttendanceRecord>("/attendance/check-out", { method: "POST" });
    }
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const records = listMock("attendance");
    const targetEmpId = employeeId || "emp-001";
    const existing = records.find((r) => r.employeeId === targetEmpId && r.date === today);
    if (existing) {
      return updateMock("attendance", existing.id, { checkOut: nowTime, workedMinutes: 480 });
    }
    return createMock("attendance", {
      id: `att-${Date.now().toString(36)}`,
      employeeId: targetEmpId,
      date: today,
      checkIn: "09:00",
      checkOut: nowTime,
      status: "PRESENT",
      workedMinutes: 480,
      breakMinutes: 60,
    });
  },
};
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
      const leaveType = types.find((t) => String(t.id) === String(request.typeId) || (Boolean(request.type && t.name) && t.name.toLowerCase() === request.type.toLowerCase()));
      if (!leaveType || leaveType.allocationRequired) {
        const allocations = listMock("allocations");
        const alloc = allocations.find(
          (a) =>
            a.id === request.allocationId ||
            (a.employeeId === request.employeeId &&
              (String(a.typeId) === String(request.typeId) || (Boolean(request.type && a.type) && a.type.toLowerCase() === request.type.toLowerCase())))
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
export const timeOffTypeService = createResourceService<TimeOffType>("timeOffTypes", "/time-off-types");
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
export type PayslipPdfResult =
  | { kind: "server-pdf"; blob: Blob }
  | { kind: "browser-print-fallback"; reason: string };

export const payslipService = {
  ...createResourceService<Payslip>("payslips", "/payslips"),
  generatePdf: async (id: string): Promise<PayslipPdfResult> => {
    if (dataMode === "api") {
      return { kind: "server-pdf", blob: await apiBlob(`/payslips/${id}/pdf`) };
    }

    const payslip = (listMock("payslips") as Payslip[]).find((record) => record.id === id);
    if (!payslip) throw new Error("Payslip record was not found.");

    return {
      kind: "browser-print-fallback",
      reason: "Server PDF generation is not configured in mock mode. The printable payslip is ready for browser PDF export.",
    };
  },
  sendEmail: async (id: string): Promise<{ ok: boolean; message: string }> => {
    if (dataMode === "api") {
      return apiClient<{ ok: boolean; message: string }>(`/payslips/${id}/email`, { method: "POST" });
    }
    const payslip = (listMock("payslips") as Payslip[]).find((record) => record.id === id);
    if (!payslip) throw new Error("Payslip record was not found.");
    return { ok: true, message: "Payslip email sent successfully (mock simulation)." };
  },
};
export const userService = createResourceService<User>("users", "/users");

export { dashboardService } from "./dashboard-service";

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
    const leaveType = types.find((t) => String(t.id) === String(request.typeId) || (Boolean(request.type && t.name) && t.name.toLowerCase() === request.type.toLowerCase()));
    const requiresAllocation = leaveType ? leaveType.allocationRequired : true;

    if (requiresAllocation) {
      // Deduct from an approved or active allocation only
      const allocations = listMock("allocations");
      const alloc = allocations.find(
        (a) =>
          (a.status === "APPROVED" || a.status === "ACTIVE") &&
          (a.id === request.allocationId ||
            (a.employeeId === request.employeeId &&
              (String(a.typeId) === String(request.typeId) || (Boolean(request.type && a.type) && a.type.toLowerCase() === request.type.toLowerCase()))))
      );

      if (!alloc) {
        throw new Error("Cannot approve request: No approved and active leave allocation found for this employee.");
      }

      const newUsed = alloc.usedDays + request.days;
      const newRemaining = Math.max(0, alloc.allocatedDays - newUsed);
      updateMock("allocations", alloc.id, { usedDays: newUsed, remainingDays: newRemaining });
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
      const leaveType = types.find((t) => String(t.id) === String(request.typeId) || (Boolean(request.type && t.name) && t.name.toLowerCase() === request.type.toLowerCase()));
      if (!leaveType || leaveType.allocationRequired) {
        const allocations = listMock("allocations");
        const alloc = allocations.find(
          (a) =>
            a.id === request.allocationId ||
            (a.employeeId === request.employeeId &&
              (String(a.typeId) === String(request.typeId) || (Boolean(request.type && a.type) && a.type.toLowerCase() === request.type.toLowerCase())))
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

export const allocationWorkflow = {
  approve: async (id: string) => {
    if (dataMode === "api") {
      return apiClient<TimeOffAllocation>(`/time-off/allocations/${id}/approve`, { method: "POST" });
    }
    const allocations = listMock("allocations");
    const allocation = allocations.find((a) => a.id === id);
    if (!allocation) throw new Error("Allocation not found");
    if (allocation.status === "APPROVED") {
      return allocation;
    }
    if (allocation.status === "ACTIVE") {
      return allocation;
    }
    if (allocation.status === "REFUSED") {
      throw new Error("Refused allocation cannot be approved directly.");
    }
    return updateMock("allocations", id, { status: "APPROVED" });
  },
  refuse: async (id: string, reason?: string) => {
    if (dataMode === "api") {
      return apiClient<TimeOffAllocation>(`/time-off/allocations/${id}/refuse`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    }
    const allocations = listMock("allocations");
    const allocation = allocations.find((a) => a.id === id);
    if (!allocation) throw new Error("Allocation not found");
    if (allocation.status === "REFUSED") {
      return allocation;
    }
    if (allocation.status === "APPROVED" || allocation.status === "ACTIVE") {
      throw new Error("An available allocation cannot be refused.");
    }
    return updateMock("allocations", id, { status: "REFUSED" });
  },
};

import {
  roleLabels,
  roleDescriptions,
  rolePermissions,
  defaultRolePermissions,
  setRolePermissions,
  resetRolePermissionsToDefault,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@/lib/auth/auth-types";
import type { RoleSummary, SystemSettings } from "@/types/domain";
import { mockStore } from "@/lib/services/mock-store";

const canonicalRoles: Role[] = ["ADMIN", "HR_PAYROLL_MANAGER", "HR_PAYROLL_USER", "HR_MANAGER", "EMPLOYEE"];

export const roleService = {
  listRoles: async (): Promise<RoleSummary[]> => {
    if (dataMode === "api") {
      try {
        const res = await apiClient<any>("/roles");
        const rawList = Array.isArray(res) ? res : (res?.roles || []);
        const users = await userService.list();
        return canonicalRoles.map((roleKey) => {
          const match = rawList.find(
            (r: any) =>
              String(r.code || "").toUpperCase() === roleKey ||
              String(r.id || "").toUpperCase() === roleKey
          );
          return {
            id: roleKey,
            name: match?.name || roleLabels[roleKey] || roleKey,
            description:
              roleDescriptions[roleKey] ||
              "Enterprise system user profile and access privileges.",
            userCount: users.filter((u) => u.role === roleKey).length,
            permissionCount: Array.isArray(match?.permissions)
              ? match.permissions.length
              : (defaultRolePermissions[roleKey] || []).length,
            isSystem: match?.is_system ?? true,
            status: "ACTIVE" as const,
          };
        });
      } catch (err) {
        console.warn("API listRoles error, fallback to mock/canonical:", err);
      }
    }
    const users = listMock("users");
    return canonicalRoles.map((role) => ({
      id: role,
      name: roleLabels[role],
      description: roleDescriptions[role],
      userCount: users.filter((u) => u.role === role).length,
      permissionCount: (rolePermissions[role] || []).length,
      isSystem: true,
      status: "ACTIVE",
    }));
  },
  getRole: async (role: Role): Promise<RoleSummary> => {
    const roles = await roleService.listRoles();
    const found = roles.find(
      (r) =>
        r.id === role ||
        String((r as any).code || "").toUpperCase() === String(role).toUpperCase()
    );
    if (found) return found;
    return {
      id: role,
      name: roleLabels[role] || role,
      description:
        roleDescriptions[role] ||
        "Enterprise system user profile and access privileges.",
      userCount: 0,
      permissionCount: (defaultRolePermissions[role] || []).length,
      isSystem: true,
      status: "ACTIVE",
    };
  },
  getPermissions: async (role: Role): Promise<Permission[]> => {
    if (!role || role === ("undefined" as any)) return [];
    if (dataMode === "api") {
      try {
        const res = await apiClient<any>(`/roles/${role}/permissions`);
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.permissions)) return res.permissions;
      } catch (err) {
        console.warn(`Role ${role} permissions API note:`, err);
      }
    }
    return [...(rolePermissions[role] || defaultRolePermissions[role] || [])];
  },
  updatePermissions: async (
    role: Role,
    permissions: Permission[]
  ): Promise<Permission[]> => {
    if (dataMode === "api") {
      try {
        const res = await apiClient<any>(`/roles/${role}/permissions`, {
          method: "PUT",
          body: JSON.stringify({ permissions }),
        });
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.permissions)) return res.permissions;
        return permissions;
      } catch (err) {
        console.warn(`Role ${role} updatePermissions API note:`, err);
      }
    }
    setRolePermissions(role, permissions);
    return [...rolePermissions[role]];
  },
  resetPermissions: async (role: Role): Promise<Permission[]> => {
    if (dataMode === "api") {
      try {
        const res = await apiClient<any>(`/roles/${role}/permissions/reset`, {
          method: "POST",
        });
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.permissions)) return res.permissions;
      } catch (err) {
        console.warn(`Role ${role} resetPermissions API note:`, err);
      }
    }
    resetRolePermissionsToDefault(role);
    return [...rolePermissions[role]];
  },
};

export const settingsService = {
  get: async (): Promise<SystemSettings> => {
    if (dataMode === "api") {
      try {
        const res = await apiClient<any>("/settings");
        if (res && res.organization) return res as SystemSettings;
        if (res && res.settings && res.settings.organization) return res.settings as SystemSettings;
      } catch (err) {
        console.warn("API settings fetch note:", err);
      }
    }
    return { ...listMock("settings") };
  },
  update: async (partial: Partial<SystemSettings>): Promise<SystemSettings> => {
    if (dataMode === "api") {
      try {
        const res = await apiClient<any>("/settings", {
          method: "PATCH",
          body: JSON.stringify(partial),
        });
        if (res && res.organization) return res as SystemSettings;
        if (res && res.settings && res.settings.organization) return res.settings as SystemSettings;
      } catch (err) {
        console.warn("API settings update note:", err);
      }
    }
    const current = listMock("settings");
    const updated: SystemSettings = {
      organization: { ...current.organization, ...(partial.organization || {}) },
      general: { ...current.general, ...(partial.general || {}) },
      payrollSecurity: { ...current.payrollSecurity, ...(partial.payrollSecurity || {}) },
      notifications: { ...current.notifications, ...(partial.notifications || {}) },
    };
    mockStore.settings = updated;
    return updated;
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
