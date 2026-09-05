import { mockAttendance, mockContracts, mockEmployees, mockPayruns, mockPayslips, mockSalaryRules, mockSalaryStructures, mockSchedules, mockTimeOffAllocations, mockTimeOffRequests, mockTimeOffTypes, mockUsers } from "@/data/mock";
import type { AttendanceRecord, Contract, Employee, Payrun, Payslip, SalaryRule, SalaryStructure, SystemSettings, TimeOffAllocation, TimeOffRequest, TimeOffType, User, WorkingSchedule } from "@/types/domain";
import type { Permission } from "@/lib/permissions";
import type { Role } from "@/lib/auth/auth-types";

export const initialSettings: SystemSettings = {
  organization: {
    companyName: "Northstar Technologies Ltd.",
    legalName: "Northstar Technologies India Private Limited",
    email: "payroll@northstar.io",
    phone: "+91 (080) 4123-4567",
    website: "https://northstar.io",
    taxId: "GSTIN29ABCDE1234F1Z5",
    fiscalYearStart: "2026-04-01",
    currency: "INR",
    timezone: "Asia/Kolkata",
  },
  general: {
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    language: "English (UK)",
    theme: "Midnight Dark",
    workingDaysPerWeek: 5,
    standardDailyHours: 8,
  },
  payrollSecurity: {
    cutoffDay: 25,
    overtimeMultiplier: 1.5,
    sessionTimeoutMinutes: 60,
    requireTwoFactor: true,
    autoPayslipEmail: true,
  },
  notifications: {
    notifyOnPayrunFinalize: true,
    notifyOnLeaveRequest: true,
    notifyOnContractExpiry: true,
    contractExpiryWarningDays: 30,
  },
};

export type Store = {
  employees: Employee[];
  contracts: Contract[];
  schedules: WorkingSchedule[];
  attendance: AttendanceRecord[];
  allocations: TimeOffAllocation[];
  timeOffRequests: TimeOffRequest[];
  timeOffTypes: TimeOffType[];
  salaryStructures: SalaryStructure[];
  salaryRules: SalaryRule[];
  payruns: Payrun[];
  payslips: Payslip[];
  users: User[];
  settings: SystemSettings;
  customRolePermissions: Partial<Record<Role, Permission[]>>;
};

export const mockStore: Store = {
  employees: [...mockEmployees],
  contracts: [...mockContracts],
  schedules: [...mockSchedules],
  attendance: [...mockAttendance],
  allocations: [...mockTimeOffAllocations],
  timeOffRequests: [...mockTimeOffRequests],
  timeOffTypes: [...mockTimeOffTypes],
  salaryStructures: [...mockSalaryStructures],
  salaryRules: [...mockSalaryRules],
  payruns: [...mockPayruns],
  payslips: [...mockPayslips],
  users: [...mockUsers],
  settings: { ...initialSettings },
  customRolePermissions: {},
};

export function listMock<K extends keyof Store>(key: K): Store[K] { return mockStore[key]; }
export function createMock<K extends keyof Store>(key: K, item: Store[K] extends any[] ? Store[K][number] : never): Store[K] extends any[] ? Store[K][number] : never { (mockStore[key] as any[]).push(item); return item; }
export function updateMock<K extends keyof Store>(key: K, id: string, changes: Partial<Store[K] extends any[] ? Store[K][number] : never>): Store[K] extends any[] ? Store[K][number] : never { const items = mockStore[key] as any[]; const index = items.findIndex((item) => item.id === id); if (index < 0) throw new Error(`Mock record ${id} was not found`); items[index] = { ...items[index], ...changes }; return items[index]; }
export function deleteMock<K extends keyof Store>(key: K, id: string): void { const items = mockStore[key] as { id: string }[]; const index = items.findIndex((item) => item.id === id); if (index >= 0) items.splice(index, 1); }

