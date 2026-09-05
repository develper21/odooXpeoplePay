import { mockAttendance, mockContracts, mockEmployees, mockPayruns, mockPayslips, mockSalaryRules, mockSalaryStructures, mockSchedules, mockTimeOffAllocations, mockTimeOffRequests, mockUsers } from "@/data/mock";
import type { AttendanceRecord, Contract, Employee, Payrun, Payslip, SalaryRule, SalaryStructure, TimeOffAllocation, TimeOffRequest, User, WorkingSchedule } from "@/types/domain";

type Store = { employees: Employee[]; contracts: Contract[]; schedules: WorkingSchedule[]; attendance: AttendanceRecord[]; allocations: TimeOffAllocation[]; timeOffRequests: TimeOffRequest[]; salaryStructures: SalaryStructure[]; salaryRules: SalaryRule[]; payruns: Payrun[]; payslips: Payslip[]; users: User[] };

export const mockStore: Store = { employees: [...mockEmployees], contracts: [...mockContracts], schedules: [...mockSchedules], attendance: [...mockAttendance], allocations: [...mockTimeOffAllocations], timeOffRequests: [...mockTimeOffRequests], salaryStructures: [...mockSalaryStructures], salaryRules: [...mockSalaryRules], payruns: [...mockPayruns], payslips: [...mockPayslips], users: [...mockUsers] };

export function listMock<K extends keyof Store>(key: K): Store[K] { return mockStore[key]; }
export function createMock<K extends keyof Store>(key: K, item: Store[K][number]): Store[K][number] { (mockStore[key] as Store[K][number][]).push(item); return item; }
export function updateMock<K extends keyof Store>(key: K, id: string, changes: Partial<Store[K][number]>): Store[K][number] { const items = mockStore[key] as (Store[K][number] & { id: string })[]; const index = items.findIndex((item) => item.id === id); if (index < 0) throw new Error(`Mock record ${id} was not found`); items[index] = { ...items[index], ...changes }; return items[index]; }
export function deleteMock<K extends keyof Store>(key: K, id: string): void { const items = mockStore[key] as { id: string }[]; const index = items.findIndex((item) => item.id === id); if (index >= 0) items.splice(index, 1); }
