"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  allocationService,
  allocationWorkflow,
  attendanceService,
  contractService,
  dashboardService,
  employeeService,
  payrunService,
  payrunWorkflow,
  payslipService,
  roleService,
  salaryCalculationService,
  salaryRuleService,
  salaryStructureService,
  scheduleService,
  settingsService,
  timeOffService,
  timeOffTypeService,
  timeOffWorkflow,
  userService,
} from "@/lib/services";
import type {
  AttendanceRecord,
  Contract,
  DashboardFilters,
  Employee,
  Payrun,
  SalaryRule,
  SalaryStructure,
  SystemSettings,
  TimeOffAllocation,
  TimeOffRequest,
  TimeOffType,
  User,
  WorkingSchedule,
} from "@/types/domain";
import type { Role } from "@/lib/auth/auth-types";
import type { Permission } from "@/lib/permissions";

export function useDashboard(filters?: DashboardFilters) { return useQuery({ queryKey: ["dashboard", filters], queryFn: () => dashboardService.get(filters) }); }
export function useEmployees() { return useQuery({ queryKey: ["employees"], queryFn: employeeService.list }); }
export function useEmployee(id: string) { return useQuery({ queryKey: ["employees", id], queryFn: () => employeeService.get(id), enabled: Boolean(id) }); }
export function useContracts() { return useQuery({ queryKey: ["contracts"], queryFn: contractService.list }); }
export function useContract(id: string) { return useQuery({ queryKey: ["contracts", id], queryFn: () => contractService.get(id), enabled: Boolean(id) }); }
export function useEmployeeContracts(employeeId: string) { return useQuery({ queryKey: ["contracts", "employee", employeeId], queryFn: () => contractService.listByEmployee(employeeId), enabled: Boolean(employeeId) }); }
export function useSchedules() { return useQuery({ queryKey: ["schedules"], queryFn: scheduleService.list }); }
export function useSchedule(id: string) { return useQuery({ queryKey: ["schedules", id], queryFn: () => scheduleService.get(id), enabled: Boolean(id) }); }
export function useAttendance(employeeId?: string) { return useQuery({ queryKey: ["attendance", employeeId ?? "all"], queryFn: attendanceService.list, select: (records) => employeeId ? records.filter((record) => record.employeeId === employeeId) : records }); }
export function useAttendanceRecord(id: string) { return useQuery({ queryKey: ["attendance", id], queryFn: () => attendanceService.get(id), enabled: Boolean(id) }); }

export function useTimeOff(employeeId?: string) { return useQuery({ queryKey: ["time-off", employeeId ?? "all"], queryFn: timeOffService.list, select: (records) => employeeId ? records.filter((record) => record.employeeId === employeeId) : records }); }
export function useTimeOffRequest(id: string) { return useQuery({ queryKey: ["time-off", id], queryFn: () => timeOffService.get(id), enabled: Boolean(id) }); }

export function useTimeOffTypes() { return useQuery({ queryKey: ["time-off-types"], queryFn: timeOffTypeService.list }); }
export function useTimeOffType(id: string) { return useQuery({ queryKey: ["time-off-types", id], queryFn: () => timeOffTypeService.get(id), enabled: Boolean(id) }); }

export function useTimeOffAllocations(employeeId?: string) { return useQuery({ queryKey: ["time-off-allocations", employeeId ?? "all"], queryFn: allocationService.list, select: (records) => employeeId ? records.filter((record) => record.employeeId === employeeId) : records }); }
export function useTimeOffAllocation(id: string) { return useQuery({ queryKey: ["time-off-allocations", id], queryFn: () => allocationService.get(id), enabled: Boolean(id) }); }

export function useSalaryStructures() { return useQuery({ queryKey: ["salary-structures"], queryFn: salaryStructureService.list }); }
export function useSalaryStructure(id: string) { return useQuery({ queryKey: ["salary-structures", id], queryFn: () => salaryStructureService.get(id), enabled: Boolean(id) }); }

export function useSalaryRules() { return useQuery({ queryKey: ["salary-rules"], queryFn: salaryRuleService.list }); }
export function useSalaryRule(id: string) { return useQuery({ queryKey: ["salary-rules", id], queryFn: () => salaryRuleService.get(id), enabled: Boolean(id) }); }

export function useCreateSalaryStructure() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<SalaryStructure, "id">) => salaryStructureService.create(input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salary-structures"] }); } }); }
export function useUpdateSalaryStructure() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<SalaryStructure> }) => salaryStructureService.update(id, input), onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["salary-structures"] }); queryClient.invalidateQueries({ queryKey: ["salary-structures", variables.id] }); } }); }
export function useDeleteSalaryStructure() { const queryClient = useQueryClient(); return useMutation({ mutationFn: salaryStructureService.remove, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salary-structures"] }); } }); }

export function useCreateSalaryRule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<SalaryRule, "id">) => salaryRuleService.create(input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salary-rules"] }); } }); }
export function useUpdateSalaryRule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<SalaryRule> }) => salaryRuleService.update(id, input), onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["salary-rules"] }); queryClient.invalidateQueries({ queryKey: ["salary-rules", variables.id] }); } }); }
export function useDeleteSalaryRule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: salaryRuleService.remove, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salary-rules"] }); queryClient.invalidateQueries({ queryKey: ["salary-structures"] }); } }); }

export function useSalaryCalculationPreview(structureId: string, baseSalary?: number) { return useQuery({ queryKey: ["salary-calculation-preview", structureId, baseSalary], queryFn: () => salaryCalculationService.calculateForStructure(structureId, { baseSalary }), enabled: Boolean(structureId) }); }

export function usePayruns() { return useQuery({ queryKey: ["payruns"], queryFn: payrunService.list }); }
export function usePayslips() { return useQuery({ queryKey: ["payslips"], queryFn: payslipService.list }); }
export function useUsers() { return useQuery({ queryKey: ["users"], queryFn: userService.list }); }

export function useCreateEmployee() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<Employee, "id">) => employeeService.create(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }) }); }
export function useUpdateEmployee() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<Employee> }) => employeeService.update(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }) }); }
export function useDeleteEmployee() { const queryClient = useQueryClient(); return useMutation({ mutationFn: employeeService.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }) }); }
export function useCreateContract() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<Contract, "id">) => contractService.create(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }) }); }
export function useUpdateContract() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<Contract> }) => contractService.update(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }) }); }
export function useDeleteContract() { const queryClient = useQueryClient(); return useMutation({ mutationFn: contractService.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }) }); }
export function useCreateSchedule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<WorkingSchedule, "id">) => scheduleService.create(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }) }); }
export function useUpdateSchedule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<WorkingSchedule> }) => scheduleService.update(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }) }); }
export function useDeleteSchedule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: scheduleService.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }) }); }
export function useCreateAttendance() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<AttendanceRecord, "id">) => attendanceService.create(input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useUpdateAttendance() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<AttendanceRecord> }) => attendanceService.update(id, input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useDeleteAttendance() { const queryClient = useQueryClient(); return useMutation({ mutationFn: attendanceService.remove, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }

export function useCreateTimeOffType() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<TimeOffType, "id">) => timeOffTypeService.create(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-off-types"] }) }); }
export function useUpdateTimeOffType() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<TimeOffType> }) => timeOffTypeService.update(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-off-types"] }) }); }
export function useDeleteTimeOffType() { const queryClient = useQueryClient(); return useMutation({ mutationFn: timeOffTypeService.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-off-types"] }) }); }

export function useCreateAllocation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<TimeOffAllocation, "id">) => allocationService.create(input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off-allocations"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useUpdateAllocation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<TimeOffAllocation> }) => allocationService.update(id, input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off-allocations"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useDeleteAllocation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: allocationService.remove, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off-allocations"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }

export function useCreateTimeOffRequest() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<TimeOffRequest, "id">) => timeOffService.create(input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useUpdateTimeOffRequest() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<TimeOffRequest> }) => timeOffService.update(id, input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useDeleteTimeOffRequest() { const queryClient = useQueryClient(); return useMutation({ mutationFn: timeOffService.remove, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off"] }); queryClient.invalidateQueries({ queryKey: ["time-off-allocations"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }

export function useApproveTimeOff() { const queryClient = useQueryClient(); return useMutation({ mutationFn: timeOffWorkflow.approve, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off"] }); queryClient.invalidateQueries({ queryKey: ["time-off-allocations"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useRefuseTimeOff() { const queryClient = useQueryClient(); return useMutation({ mutationFn: timeOffWorkflow.refuse, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["time-off"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }

export function usePayrun(id: string) { return useQuery({ queryKey: ["payruns", id], queryFn: () => payrunService.get(id), enabled: Boolean(id) }); }
export function usePayslip(id: string) { return useQuery({ queryKey: ["payslips", id], queryFn: () => payslipService.get(id), enabled: Boolean(id) }); }
export function useEmployeePayslips(employeeId?: string) { return useQuery({ queryKey: ["payslips", "employee", employeeId ?? "all"], queryFn: payslipService.list, select: (slips) => employeeId ? slips.filter((s) => s.employeeId === employeeId) : slips }); }

export function useCreatePayrun() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<Payrun, "id">) => payrunService.create(input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payruns"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useComputePayrun() { const queryClient = useQueryClient(); return useMutation({ mutationFn: payrunWorkflow.compute, onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["payruns"] }); queryClient.invalidateQueries({ queryKey: ["payruns", variables] }); queryClient.invalidateQueries({ queryKey: ["payslips"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useValidatePayrun() { const queryClient = useQueryClient(); return useMutation({ mutationFn: payrunWorkflow.validate, onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["payruns"] }); queryClient.invalidateQueries({ queryKey: ["payruns", variables] }); queryClient.invalidateQueries({ queryKey: ["payslips"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useMarkPayrunPaid() { const queryClient = useQueryClient(); return useMutation({ mutationFn: payrunWorkflow.markPaid, onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["payruns"] }); queryClient.invalidateQueries({ queryKey: ["payruns", variables] }); queryClient.invalidateQueries({ queryKey: ["payslips"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }
export function useSendPayslips() { const queryClient = useQueryClient(); return useMutation({ mutationFn: payrunWorkflow.sendPayslips, onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["payslips"] }); queryClient.invalidateQueries({ queryKey: ["payruns", variables] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } }); }

// User Management Hooks
export function useUser(id: string) {
  return useQuery({ queryKey: ["users", id], queryFn: () => userService.get(id), enabled: Boolean(id) });
}
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<User, "id">) => userService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<User> }) => userService.update(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
    },
  });
}
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

// Role & Permission Hooks
export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: roleService.listRoles });
}
export function useRole(role: Role) {
  return useQuery({ queryKey: ["roles", role], queryFn: () => roleService.getRole(role), enabled: Boolean(role) });
}
export function useRolePermissions(role: Role) {
  return useQuery({ queryKey: ["roles", role, "permissions"], queryFn: () => roleService.getPermissions(role), enabled: Boolean(role) });
}
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permissions }: { role: Role; permissions: Permission[] }) =>
      roleService.updatePermissions(role, permissions),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", variables.role] });
      queryClient.invalidateQueries({ queryKey: ["roles", variables.role, "permissions"] });
    },
  });
}
export function useResetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: Role) => roleService.resetPermissions(role),
    onSuccess: (_data, role) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", role] });
      queryClient.invalidateQueries({ queryKey: ["roles", role, "permissions"] });
    },
  });
}

// System Settings Hooks
export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: settingsService.get });
}
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partial: Partial<SystemSettings>) => settingsService.update(partial),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// Allocation Approval / Refusal Hooks
export function useApproveAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: allocationWorkflow.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["time-off"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
export function useRefuseAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; reason?: string } | string) => {
      const id = typeof args === "string" ? args : args.id;
      const reason = typeof args === "string" ? undefined : args.reason;
      return allocationWorkflow.refuse(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["time-off"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}


