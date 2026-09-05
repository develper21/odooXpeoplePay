export type ID = string;
export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
export type ContractStatus = "ACTIVE" | "EXPIRED" | "DRAFT";
export type RequestStatus = "PENDING" | "APPROVED" | "REFUSED";
export type PayrunStatus = "DRAFT" | "PROCESSING" | "PENDING_APPROVAL" | "VALIDATED" | "PAID";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "MISSING_CHECKOUT";

export interface Employee { id: ID; employeeNumber: string; firstName: string; lastName: string; email: string; department: string; position: string; managerId?: ID; status: EmploymentStatus; contractId?: ID; scheduleId?: ID; salaryStructureId?: ID; bankAccount?: string; joinedOn: string; }
export interface Contract { id: ID; employeeId: ID; title: string; startDate: string; endDate?: string; status: ContractStatus; monthlySalary: number; }
export interface WorkingSchedule { id: ID; name: string; timezone: string; weeklyHours: number; days: string[]; }
export interface AttendanceRecord { id: ID; employeeId: ID; date: string; checkIn: string; checkOut?: string; status: AttendanceStatus; }
export interface TimeOffAllocation { id: ID; employeeId: ID; type: string; allocatedDays: number; usedDays: number; remainingDays: number; }
export interface TimeOffRequest { id: ID; employeeId: ID; type: string; startDate: string; endDate: string; days: number; status: RequestStatus; reason: string; }
export interface SalaryStructure { id: ID; name: string; currency: string; basePercentage: number; ruleIds: ID[]; }
export interface SalaryRule { id: ID; code: string; name: string; category: "EARNING" | "DEDUCTION"; amount: number; kind: "FIXED" | "PERCENTAGE"; }
export interface Payrun { id: ID; reference: string; period: string; employeeCount: number; grossTotal: number; netTotal: number; status: PayrunStatus; }
export interface Payslip { id: ID; payrunId: ID; employeeId: ID; reference: string; gross: number; net: number; status: "DRAFT" | "PAID" | "DUPLICATE_WARNING"; }
export interface User { id: ID; name: string; email: string; role: string; status: "ACTIVE" | "INVITED" | "INACTIVE"; }
export interface DashboardMetric { label: string; value: string; change: string; trend: "up" | "down"; tone: "blue" | "green" | "amber" | "violet"; }
export interface DashboardAlert { label: string; detail: string; tone: "warning" | "pending" | "approved" | "error"; }
export interface DashboardData { metrics: DashboardMetric[]; alerts: DashboardAlert[]; activeEmployees: number; presentToday: number; pendingRequests: number; salaryByDepartment: { name: string; value: number }[]; salaryTrend: { name: string; value: number }[]; }
