import type { TimeOffAllocation, TimeOffRequest } from "@/types/domain";
export const mockTimeOffAllocations: TimeOffAllocation[] = [
  { id: "alloc-001", employeeId: "emp-001", type: "Annual Leave", allocatedDays: 25, usedDays: 8, remainingDays: 17 },
  { id: "alloc-002", employeeId: "emp-002", type: "Annual Leave", allocatedDays: 25, usedDays: 14, remainingDays: 11 },
  { id: "alloc-003", employeeId: "emp-003", type: "Annual Leave", allocatedDays: 25, usedDays: 20, remainingDays: 5 },
  { id: "alloc-004", employeeId: "emp-004", type: "Annual Leave", allocatedDays: 25, usedDays: 2, remainingDays: 23 },
];
export const mockTimeOffRequests: TimeOffRequest[] = [
  { id: "tor-001", employeeId: "emp-001", type: "Annual Leave", startDate: "2026-09-21", endDate: "2026-09-23", days: 3, status: "PENDING", reason: "Family trip" },
  { id: "tor-002", employeeId: "emp-002", type: "Personal Day", startDate: "2026-08-18", endDate: "2026-08-18", days: 1, status: "APPROVED", reason: "Appointment" },
  { id: "tor-003", employeeId: "emp-003", type: "Medical Leave", startDate: "2026-08-04", endDate: "2026-08-08", days: 5, status: "APPROVED", reason: "Recovery" },
  { id: "tor-004", employeeId: "emp-004", type: "Annual Leave", startDate: "2026-07-11", endDate: "2026-07-14", days: 4, status: "REFUSED", reason: "Blackout period" },
];
