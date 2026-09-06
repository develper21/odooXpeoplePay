import type { Role } from "@/lib/auth/auth-types";

export type ID = string;
export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
export type EmployeeType = "FULL_TIME" | "PART_TIME" | "CONTRACT";
export type ContractStatus = "ACTIVE" | "EXPIRED" | "DRAFT" | "TERMINATED";
export type RequestStatus = "PENDING" | "APPROVED" | "REFUSED" | "CANCELLED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "OVERTIME" | "MISSING_CHECKOUT" | "MANUAL_EDIT";

export type TimeOffUnit = "DAYS" | "HOURS";
export type TimeOffTypeStatus = "ACTIVE" | "INACTIVE";
export type AllocationStatus = "ACTIVE" | "EXPIRED" | "DRAFT" | "INACTIVE" | "PENDING" | "APPROVED" | "REFUSED";

export interface TimeOffType {
  id: ID;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  unit: TimeOffUnit;
  allocationRequired: boolean;
  approvalRequired: boolean;
  payrollIntegration: boolean;
  status: TimeOffTypeStatus;
}

export interface Employee { id: ID; employeeNumber: string; firstName: string; lastName: string; email: string; phone?: string; department: string; position: string; managerId?: ID; status: EmploymentStatus; employeeType: EmployeeType; contractId?: ID; scheduleId?: ID; salaryStructureId?: ID; bankAccount?: string; joinedOn: string; }
export interface Contract { id: ID; employeeId: ID; reference: string; title: string; startDate: string; endDate?: string; department: string; position: string; salaryStructureId?: ID; status: ContractStatus; monthlySalary: number; }
export type ScheduleType = "STANDARD" | "FLEXIBLE" | "SHIFT" | "PART_TIME";
export type ScheduleStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export interface ScheduleDay { day: string; enabled: boolean; startTime: string; endTime: string; breakMinutes: number; }
export interface WorkingSchedule { id: ID; name: string; type: ScheduleType; status: ScheduleStatus; timezone: string; weeklyHours: number; days: ScheduleDay[]; }
export interface AttendanceRecord { id: ID; employeeId: ID; date: string; checkIn: string; checkOut?: string; breakMinutes?: number; workedMinutes?: number; notes?: string; manuallyEdited?: boolean; status: AttendanceStatus; }
export interface TimeOffAllocation { id: ID; employeeId: ID; typeId?: ID; type: string; allocatedDays: number; usedDays: number; remainingDays: number; unit?: TimeOffUnit; validFrom: string; validTo: string; status: AllocationStatus; }
export interface TimeOffRequest { id: ID; employeeId: ID; typeId?: ID; type: string; allocationId?: ID; startDate: string; endDate: string; days: number; unit?: TimeOffUnit; status: RequestStatus; reason: string; }
export type SalaryRuleCategory = "BASIC" | "ALLOWANCE" | "GROSS" | "DEDUCTION" | "NET";
export type ComputationType = "FIXED" | "PERCENTAGE" | "FORMULA";
export type SalaryStructureStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export type SalaryRuleStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export interface SalaryRule {
  id: ID;
  code: string;
  name: string;
  category: SalaryRuleCategory | "EARNING" | "DEDUCTION";
  sequence: number;
  computationType: ComputationType;
  status: SalaryRuleStatus;
  description?: string;
  amount?: number;
  percentage?: number;
  basedOn?: string[];
  formula?: string;
  kind?: "FIXED" | "PERCENTAGE";
}

export interface SalaryStructure {
  id: ID;
  name: string;
  description?: string;
  status: SalaryStructureStatus;
  currency?: string;
  ruleIds: ID[];
  basePercentage?: number;
}
export type PayrunStatus = "DRAFT" | "COMPUTED" | "PROCESSING" | "WARNING" | "PENDING_APPROVAL" | "VALIDATED" | "PAID";
export type PayslipStatus = "DRAFT" | "COMPUTED" | "VALIDATED" | "PAID" | "DUPLICATE_WARNING";
export type PayslipDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export type WarningSeverity = "INFO" | "WARNING" | "ERROR";

export type WarningType =
  | "MISSING_BANK_DETAILS"
  | "MISSING_ACTIVE_CONTRACT"
  | "CONTRACT_NOT_VALID_FOR_PERIOD"
  | "MISSING_REQUIRED_EMPLOYEE_DATA"
  | "DUPLICATE_PAYSLIP"
  | "INVALID_SALARY_CONFIGURATION"
  | "CALCULATION_ERROR";

export interface PayrunWarning {
  id: ID;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  employeeId?: ID;
  employeeName?: string;
  payslipId?: ID;
  blocking?: boolean;
}

export interface PayslipLine {
  ruleId: ID;
  sequence: number;
  code: string;
  name: string;
  category: SalaryRuleCategory;
  amount: number;
  calculationDisplay?: string;
}

export interface Payrun {
  id: ID;
  reference: string;
  name?: string;
  salaryStructureId?: ID;
  period: string;
  periodStart?: string;
  periodEnd?: string;
  employeeCount: number;
  selectedEmployeeIds?: ID[];
  grossTotal: number;
  deductionsTotal?: number;
  netTotal: number;
  status: PayrunStatus;
  warnings?: PayrunWarning[];
  createdAt?: string;
  computedAt?: string;
  validatedAt?: string;
  paidAt?: string;
}

export interface Payslip {
  id: ID;
  payrunId: ID;
  employeeId: ID;
  reference: string;
  contractId?: ID;
  salaryStructureId?: ID;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  workedDays?: number;
  basicTotal?: number;
  allowancesTotal?: number;
  gross: number;
  deductions?: number;
  net: number;
  status: PayslipStatus;
  deliveryStatus?: PayslipDeliveryStatus;
  deliveryError?: string;
  lines?: PayslipLine[];
  warnings?: PayrunWarning[];
  sentAt?: string;
  paidAt?: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INVITED" | "INACTIVE";
  employeeId?: ID;
  lastActivity?: string;
  createdAt?: string;
}
export interface DashboardMetric { label: string; value: string; change: string; trend: "up" | "down"; tone: "blue" | "green" | "amber" | "violet"; href?: string; }
export interface DashboardAlert { label: string; detail: string; tone: "warning" | "pending" | "approved" | "error"; }

export interface ActionableAlert {
  id: string;
  title: string;
  detail: string;
  severity: "INFO" | "WARNING" | "ERROR";
  href: string;
  linkText: string;
  entityType?: "PAYRUN" | "PAYSLIP" | "EMPLOYEE" | "CONTRACT" | "TIME_OFF" | "ATTENDANCE";
}

export interface AttendanceOverview {
  present: number;
  late: number;
  absent: number;
  overtime: number;
  missingCheckout: number;
  manualEdit: number;
  totalRecords: number;
  coveragePercent: number;
}

export interface TimeOffOverview {
  approvedDays: number;
  pendingRequests: number;
  totalAllocatedDays: number;
  totalRemainingDays: number;
  byType: { type: string; days: number; count: number }[];
}

export interface DepartmentBreakdownItem {
  department: string;
  headcount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  averageNet: number;
}

export interface DashboardFilters {
  period?: string;
  department?: string;
  employeeType?: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  alerts: DashboardAlert[];
  actionableAlerts: ActionableAlert[];
  activeEmployees: number;
  presentToday: number;
  pendingRequests: number;
  salaryByDepartment: { name: string; value: number; headcount?: number; gross?: number }[];
  salaryTrend: { name: string; value: number; gross?: number }[];
  attendanceOverview: AttendanceOverview;
  timeOffOverview: TimeOffOverview;
  departmentBreakdown: DepartmentBreakdownItem[];
  availablePeriods: string[];
  availableDepartments: string[];
  filtersApplied: DashboardFilters;
}

export interface RoleSummary {
  id: Role;
  name: string;
  description: string;
  userCount: number;
  permissionCount: number;
  isSystem: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export interface SystemSettings {
  organization: {
    companyName: string;
    legalName: string;
    email: string;
    phone: string;
    website: string;
    taxId: string;
    fiscalYearStart: string;
    currency: string;
    timezone: string;
  };
  general: {
    dateFormat: string;
    timeFormat: string;
    language: string;
    theme: string;
    workingDaysPerWeek: number;
    standardDailyHours: number;
  };
  payrollSecurity: {
    cutoffDay: number;
    overtimeMultiplier: number;
    sessionTimeoutMinutes: number;
    requireTwoFactor: boolean;
    autoPayslipEmail: boolean;
  };
  notifications: {
    notifyOnPayrunFinalize: boolean;
    notifyOnLeaveRequest: boolean;
    notifyOnContractExpiry: boolean;
    contractExpiryWarningDays: number;
  };
}

