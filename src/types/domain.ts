export type ID = string;
export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
export type EmployeeType = "FULL_TIME" | "PART_TIME" | "CONTRACT";
export type ContractStatus = "ACTIVE" | "EXPIRED" | "DRAFT" | "TERMINATED";
export type RequestStatus = "PENDING" | "APPROVED" | "REFUSED" | "CANCELLED";
export type PayrunStatus = "DRAFT" | "PROCESSING" | "PENDING_APPROVAL" | "VALIDATED" | "PAID";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "OVERTIME" | "MISSING_CHECKOUT" | "MANUAL_EDIT";

export type TimeOffUnit = "DAYS" | "HOURS";
export type TimeOffTypeStatus = "ACTIVE" | "INACTIVE";
export type AllocationStatus = "ACTIVE" | "EXPIRED" | "DRAFT" | "INACTIVE" | "PENDING" | "APPROVED";

export interface TimeOffType { id: ID; name: string; unit: TimeOffUnit; allocationRequired: boolean; approvalRequired: boolean; payrollIntegration: boolean; status: TimeOffTypeStatus; }

export interface Employee { id: ID; employeeNumber: string; firstName: string; lastName: string; email: string; phone?: string; department: string; position: string; managerId?: ID; status: EmploymentStatus; employeeType: EmployeeType; contractId?: ID; scheduleId?: ID; salaryStructureId?: ID; bankAccount?: string; joinedOn: string; }
export interface Contract { id: ID; employeeId: ID; reference: string; title: string; startDate: string; endDate?: string; department: string; position: string; salaryStructureId?: ID; status: ContractStatus; monthlySalary: number; }
export type ScheduleType = "STANDARD" | "FLEXIBLE" | "SHIFT" | "PART_TIME";
export type ScheduleStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export interface ScheduleDay { day: string; enabled: boolean; startTime: string; endTime: string; breakMinutes: number; }
export interface WorkingSchedule { id: ID; name: string; type: ScheduleType; status: ScheduleStatus; timezone: string; weeklyHours: number; days: ScheduleDay[]; }
export interface AttendanceRecord { id: ID; employeeId: ID; date: string; checkIn: string; checkOut?: string; breakMinutes?: number; workedMinutes?: number; notes?: string; manuallyEdited?: boolean; status: AttendanceStatus; }
export interface TimeOffAllocation { id: ID; employeeId: ID; typeId?: ID; type: string; allocatedDays: number; usedDays: number; remainingDays: number; unit?: TimeOffUnit; validFrom: string; validTo: string; status: AllocationStatus; }
export interface TimeOffRequest { id: ID; employeeId: ID; typeId?: ID; type: string; allocationId?: ID; startDate: string; endDate: string; days: number; unit?: TimeOffUnit; status: RequestStatus; reason: string; }
export interface SalaryStructure { id: ID; name: string; currency: string; basePercentage: number; ruleIds: ID[]; }
export interface SalaryRule { id: ID; code: string; name: string; category: "EARNING" | "DEDUCTION"; amount: number; kind: "FIXED" | "PERCENTAGE"; }
export interface Payrun { id: ID; reference: string; period: string; employeeCount: number; grossTotal: number; netTotal: number; status: PayrunStatus; }
export interface Payslip { id: ID; payrunId: ID; employeeId: ID; reference: string; gross: number; net: number; status: "DRAFT" | "PAID" | "DUPLICATE_WARNING"; }
export interface User { id: ID; name: string; email: string; role: "EMPLOYEE" | "HR_MANAGER" | "HR_PAYROLL_USER" | "HR_PAYROLL_MANAGER" | "ADMIN"; status: "ACTIVE" | "INVITED" | "INACTIVE"; }
export interface DashboardMetric { label: string; value: string; change: string; trend: "up" | "down"; tone: "blue" | "green" | "amber" | "violet"; }
export interface DashboardAlert { label: string; detail: string; tone: "warning" | "pending" | "approved" | "error"; }
export interface DashboardData { metrics: DashboardMetric[]; alerts: DashboardAlert[]; activeEmployees: number; presentToday: number; pendingRequests: number; salaryByDepartment: { name: string; value: number }[]; salaryTrend: { name: string; value: number }[]; }
