"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { allocationService, attendanceService, contractService, dashboardService, employeeService, payrunService, payrunWorkflow, payslipService, salaryRuleService, salaryStructureService, scheduleService, timeOffService, timeOffWorkflow, userService } from "@/lib/services";
import type { Employee, Payrun } from "@/types/domain";

export function useDashboard() { return useQuery({ queryKey: ["dashboard"], queryFn: dashboardService.get }); }
export function useEmployees() { return useQuery({ queryKey: ["employees"], queryFn: employeeService.list }); }
export function useContracts() { return useQuery({ queryKey: ["contracts"], queryFn: contractService.list }); }
export function useSchedules() { return useQuery({ queryKey: ["schedules"], queryFn: scheduleService.list }); }
export function useAttendance() { return useQuery({ queryKey: ["attendance"], queryFn: attendanceService.list }); }
export function useTimeOff() { return useQuery({ queryKey: ["time-off"], queryFn: timeOffService.list }); }
export function useTimeOffAllocations() { return useQuery({ queryKey: ["time-off-allocations"], queryFn: allocationService.list }); }
export function useSalaryStructures() { return useQuery({ queryKey: ["salary-structures"], queryFn: salaryStructureService.list }); }
export function useSalaryRules() { return useQuery({ queryKey: ["salary-rules"], queryFn: salaryRuleService.list }); }
export function usePayruns() { return useQuery({ queryKey: ["payruns"], queryFn: payrunService.list }); }
export function usePayslips() { return useQuery({ queryKey: ["payslips"], queryFn: payslipService.list }); }
export function useUsers() { return useQuery({ queryKey: ["users"], queryFn: userService.list }); }

export function useCreateEmployee() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<Employee, "id">) => employeeService.create(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }) }); }
export function useUpdateEmployee() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<Employee> }) => employeeService.update(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }) }); }
export function useDeleteEmployee() { const queryClient = useQueryClient(); return useMutation({ mutationFn: employeeService.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }) }); }
export function useApproveTimeOff() { const queryClient = useQueryClient(); return useMutation({ mutationFn: timeOffWorkflow.approve, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-off"] }) }); }
export function useRefuseTimeOff() { const queryClient = useQueryClient(); return useMutation({ mutationFn: timeOffWorkflow.refuse, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time-off"] }) }); }
export function useCreatePayrun() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<Payrun, "id">) => payrunService.create(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payruns"] }) }); }
export function useComputePayrun() { const queryClient = useQueryClient(); return useMutation({ mutationFn: payrunWorkflow.compute, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payruns"] }) }); }
export function useValidatePayrun() { const queryClient = useQueryClient(); return useMutation({ mutationFn: payrunWorkflow.validate, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payruns"] }) }); }
export function useMarkPayrunPaid() { const queryClient = useQueryClient(); return useMutation({ mutationFn: payrunWorkflow.markPaid, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payruns"] }) }); }
export function useSendPayslips() { return useMutation({ mutationFn: payrunWorkflow.sendPayslips }); }

