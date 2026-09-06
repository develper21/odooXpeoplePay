import { apiClient } from "@/lib/api/client";
import { dataMode } from "@/lib/data-mode";
import { listMock } from "@/lib/services/mock-store";
import type {
  ActionableAlert,
  AttendanceOverview,
  DashboardAlert,
  DashboardData,
  DashboardFilters,
  DashboardMetric,
  DepartmentBreakdownItem,
  TimeOffOverview,
} from "@/types/domain";
import { isAllocationAvailable } from "@/lib/time-off-utils";

export function deriveDashboardData(filters?: DashboardFilters): DashboardData {
  const employees = listMock("employees");
  const contracts = listMock("contracts");
  const attendance = listMock("attendance");
  const timeOffRequests = listMock("timeOffRequests");
  const allocations = listMock("allocations");
  const payruns = listMock("payruns");
  const payslips = listMock("payslips");

  // Determine available options
  const rawPeriods = Array.from(new Set(payruns.map((p) => p.period))).filter(Boolean);
  const availablePeriods = rawPeriods.sort((a, b) => b.localeCompare(a));

  const availableDepartments = Array.from(
    new Set(employees.map((e) => e.department).filter(Boolean))
  ).sort();

  // Normalize filters
  const period = filters?.period && filters.period !== "ALL" ? filters.period : "September 2026";
  const department = filters?.department || "ALL";
  const employeeType = filters?.employeeType || "ALL";

  // 1. Filter Employees
  const filteredEmployees = employees.filter((emp) => {
    if (department !== "ALL" && emp.department !== department) return false;
    if (employeeType !== "ALL" && emp.employeeType !== employeeType) return false;
    return true;
  });

  const filteredEmpIds = new Set(filteredEmployees.map((e) => e.id));
  const activeEmployees = filteredEmployees.filter((e) => e.status === "ACTIVE").length;

  // 2. Filter Payslips
  const filteredPayslips = payslips.filter((ps) => {
    if (!filteredEmpIds.has(ps.employeeId)) return false;
    if (period !== "ALL" && ps.period !== period) return false;
    return true;
  });

  // Total Net Salary Paid (only PAID payslips)
  const paidPayslips = filteredPayslips.filter((ps) => ps.status === "PAID");
  const totalNetSalaryPaid = paidPayslips.reduce((sum, ps) => sum + (Number(ps.net) || 0), 0);

  // Payslips Generated
  const payslipsGenerated = filteredPayslips.length;

  // Average Salary (from generated payslips, or paid if available)
  const relevantForAvg = filteredPayslips.length > 0 ? filteredPayslips : paidPayslips;
  const averageSalary =
    relevantForAvg.length > 0
      ? Math.round(relevantForAvg.reduce((sum, ps) => sum + (Number(ps.net) || 0), 0) / relevantForAvg.length)
      : 0;

  // 3. Filter Time Off Requests
  const filteredTimeOff = timeOffRequests.filter((r) => {
    if (!filteredEmpIds.has(r.employeeId)) return false;
    if (period !== "ALL") {
      const monthStr = periodToMonthPrefix(period);
      if (monthStr && !r.startDate.startsWith(monthStr) && !r.endDate.startsWith(monthStr)) {
        return false;
      }
    }
    return true;
  });

  const approvedTimeOffDays = filteredTimeOff
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + (Number(r.days) || 0), 0);

  const pendingRequestsCount = timeOffRequests.filter(
    (r) => filteredEmpIds.has(r.employeeId) && r.status === "PENDING"
  ).length;

  // 4. Filter Attendance
  const filteredAttendance = attendance.filter((a) => {
    if (!filteredEmpIds.has(a.employeeId)) return false;
    if (period !== "ALL") {
      const monthStr = periodToMonthPrefix(period);
      if (monthStr && !a.date.startsWith(monthStr)) {
        return false;
      }
    }
    return true;
  });

  // Attendance Health calculation
  const presentCount = filteredAttendance.filter((a) => a.status === "PRESENT").length;
  const lateCount = filteredAttendance.filter((a) => a.status === "LATE").length;
  const absentCount = filteredAttendance.filter((a) => a.status === "ABSENT").length;
  const overtimeCount = filteredAttendance.filter((a) => a.status === "OVERTIME").length;
  const missingCheckoutCount = filteredAttendance.filter((a) => a.status === "MISSING_CHECKOUT").length;
  const manualEditCount = filteredAttendance.filter((a) => a.status === "MANUAL_EDIT").length;

  const totalAttendanceRecords = filteredAttendance.length;
  const positiveAttendanceCount = presentCount + overtimeCount + manualEditCount;
  const attendanceCoverage =
    totalAttendanceRecords > 0
      ? Math.round((positiveAttendanceCount / totalAttendanceRecords) * 1000) / 10
      : 100;

  // 5. Build KPI Metrics
  const metrics: DashboardMetric[] = [
    {
      label: "Total Net Salary Paid",
      value: `₹${totalNetSalaryPaid.toLocaleString("en-IN")}`,
      change: totalNetSalaryPaid > 0 ? "+4.2%" : "0.0%",
      trend: "up",
      tone: "blue",
      href: "/payroll",
    },
    {
      label: "Payslips Generated",
      value: payslipsGenerated.toLocaleString(),
      change: payslipsGenerated > 0 ? `+${payslipsGenerated}` : "0",
      trend: "up",
      tone: "green",
      href: "/payslips",
    },
    {
      label: "Average Net Salary",
      value: averageSalary > 0 ? `₹${averageSalary.toLocaleString("en-IN")}` : "₹0",
      change: "+2.8%",
      trend: "up",
      tone: "violet",
      href: "/reports",
    },
    {
      label: "Approved Time Off",
      value: `${approvedTimeOffDays} ${approvedTimeOffDays === 1 ? "day" : "days"}`,
      change: "-1.5%",
      trend: "down",
      tone: "amber",
      href: "/time-off/requests",
    },
    {
      label: "Attendance Health",
      value: `${attendanceCoverage}%`,
      change: "+1.2%",
      trend: "up",
      tone: attendanceCoverage >= 90 ? "green" : "amber",
      href: "/attendance",
    },
  ];

  // 6. Salary Cost by Department
  const salaryByDepartment: { name: string; value: number; headcount: number; gross: number }[] = [];
  const deptList = department !== "ALL" ? [department] : availableDepartments;

  deptList.forEach((dept) => {
    const deptEmployees = employees.filter(
      (e) => e.department === dept && (employeeType === "ALL" || e.employeeType === employeeType)
    );
    const deptEmpIds = new Set(deptEmployees.map((e) => e.id));
    const deptPayslips = payslips.filter((ps) => {
      if (!deptEmpIds.has(ps.employeeId)) return false;
      if (period !== "ALL" && ps.period !== period) return false;
      return true;
    });

    const netCost = deptPayslips.reduce((sum, ps) => sum + (Number(ps.net) || 0), 0);
    const grossCost = deptPayslips.reduce((sum, ps) => sum + (Number(ps.gross) || 0), 0);

    if (deptEmployees.length > 0 || netCost > 0) {
      salaryByDepartment.push({
        name: dept,
        value: netCost,
        headcount: deptEmployees.filter((e) => e.status === "ACTIVE").length,
        gross: grossCost,
      });
    }
  });

  salaryByDepartment.sort((a, b) => b.value - a.value);

  // 7. Monthly Net Salary Trend (Historical 6 months: Apr, May, Jun, Jul, Aug, Sep)
  const trendMonths = [
    { period: "April 2026", label: "Apr" },
    { period: "May 2026", label: "May" },
    { period: "June 2026", label: "Jun" },
    { period: "July 2026", label: "Jul" },
    { period: "August 2026", label: "Aug" },
    { period: "September 2026", label: "Sep" },
  ];

  const salaryTrend = trendMonths.map(({ period: pName, label }) => {
    const monthSlips = payslips.filter((ps) => {
      if (!filteredEmpIds.has(ps.employeeId)) return false;
      return ps.period === pName;
    });

    const totalNet = monthSlips.reduce((sum, ps) => sum + (Number(ps.net) || 0), 0);
    const totalGross = monthSlips.reduce((sum, ps) => sum + (Number(ps.gross) || 0), 0);
    return {
      name: label,
      value: totalNet,
      gross: totalGross,
    };
  });

  // 8. Actionable Operational Alerts
  const actionableAlerts: ActionableAlert[] = [];
  const alerts: DashboardAlert[] = [];

  // Payruns needing attention
  payruns.forEach((pr) => {
    if (pr.status === "COMPUTED" || pr.status === "DRAFT") {
      actionableAlerts.push({
        id: `alert-pr-${pr.id}`,
        title: `Payrun ${pr.status === "COMPUTED" ? "Awaiting Validation" : "in Draft"}`,
        detail: `${pr.name} has ${pr.employeeCount} employees ready for processing.`,
        severity: "WARNING",
        href: `/payroll/${pr.id}`,
        linkText: "Review Payrun",
        entityType: "PAYRUN",
      });
    }

    if (pr.warnings && pr.warnings.length > 0) {
      pr.warnings.forEach((w) => {
        actionableAlerts.push({
          id: `alert-pr-warn-${w.id}`,
          title: formatWarningTitle(w.type),
          detail: w.message,
          severity: w.severity === "ERROR" ? "ERROR" : "WARNING",
          href: w.employeeId ? `/employees/${w.employeeId}` : `/payroll/${pr.id}`,
          linkText: w.employeeId ? "View Employee" : "View Payrun",
          entityType: w.employeeId ? "EMPLOYEE" : "PAYRUN",
        });
      });
    }
  });

  // Missing contracts for active employees
  const activeContractsByEmp = new Set(
    contracts.filter((c) => c.status === "ACTIVE").map((c) => c.employeeId)
  );
  employees.forEach((emp) => {
    if (emp.status === "ACTIVE" && !activeContractsByEmp.has(emp.id)) {
      actionableAlerts.push({
        id: `alert-no-contract-${emp.id}`,
        title: "Missing Active Contract",
        detail: `${emp.firstName} ${emp.lastName} (${emp.department}) does not have an active contract.`,
        severity: "ERROR",
        href: `/contracts/new?employeeId=${emp.id}`,
        linkText: "Create Contract",
        entityType: "CONTRACT",
      });
    }

    // Missing bank details
    if (emp.status === "ACTIVE" && !emp.bankAccount) {
      actionableAlerts.push({
        id: `alert-no-bank-${emp.id}`,
        title: "Missing Bank Account",
        detail: `${emp.firstName} ${emp.lastName} has no bank account configured for salary disbursement.`,
        severity: "WARNING",
        href: `/employees/${emp.id}`,
        linkText: "Update Profile",
        entityType: "EMPLOYEE",
      });
    }
  });

  // Attendance exceptions
  const missingCheckouts = attendance.filter((a) => a.status === "MISSING_CHECKOUT");
  if (missingCheckouts.length > 0) {
    const sampleEmp = employees.find((e) => e.id === missingCheckouts[0].employeeId);
    actionableAlerts.push({
      id: "alert-missing-checkouts",
      title: "Attendance Exception Detected",
      detail: `${missingCheckouts.length} records require checkout correction (${sampleEmp ? `${sampleEmp.firstName} ${sampleEmp.lastName} and others` : "multiple employees"}).`,
      severity: "WARNING",
      href: "/attendance",
      linkText: "Fix Attendance",
      entityType: "ATTENDANCE",
    });
  }

  // Pending Time Off
  if (pendingRequestsCount > 0) {
    actionableAlerts.push({
      id: "alert-pending-timeoff",
      title: "Pending Time Off Requests",
      detail: `${pendingRequestsCount} leave requests require manager approval.`,
      severity: "INFO",
      href: "/time-off/requests",
      linkText: "Review Requests",
      entityType: "TIME_OFF",
    });
  }

  // Backwards-compatible alerts array
  actionableAlerts.slice(0, 5).forEach((a) => {
    alerts.push({
      label: a.title,
      detail: a.detail,
      tone: a.severity === "ERROR" ? "error" : a.severity === "WARNING" ? "warning" : "pending",
    });
  });

  // 9. Attendance Overview
  const attendanceOverview: AttendanceOverview = {
    present: presentCount,
    late: lateCount,
    absent: absentCount,
    overtime: overtimeCount,
    missingCheckout: missingCheckoutCount,
    manualEdit: manualEditCount,
    totalRecords: totalAttendanceRecords,
    coveragePercent: attendanceCoverage,
  };

  // 10. Time Off Overview
  const filteredAllocations = allocations.filter((a) => filteredEmpIds.has(a.employeeId) && isAllocationAvailable(a));
  const totalAllocatedDays = filteredAllocations.reduce((s, a) => s + (Number(a.allocatedDays) || 0), 0);
  const totalRemainingDays = filteredAllocations.reduce((s, a) => s + (Number(a.remainingDays) || 0), 0);

  const typeMap: Record<string, { days: number; count: number }> = {};
  filteredTimeOff.forEach((req) => {
    if (req.status === "APPROVED") {
      if (!typeMap[req.type]) {
        typeMap[req.type] = { days: 0, count: 0 };
      }
      typeMap[req.type].days += Number(req.days) || 0;
      typeMap[req.type].count += 1;
    }
  });

  const byType = Object.entries(typeMap).map(([type, stats]) => ({
    type,
    days: stats.days,
    count: stats.count,
  }));
  byType.sort((a, b) => b.days - a.days);

  const timeOffOverview: TimeOffOverview = {
    approvedDays: approvedTimeOffDays,
    pendingRequests: pendingRequestsCount,
    totalAllocatedDays,
    totalRemainingDays,
    byType,
  };

  // 11. Department Breakdown Table
  const departmentBreakdown: DepartmentBreakdownItem[] = deptList.map((dept) => {
    const deptEmployees = employees.filter(
      (e) => e.department === dept && (employeeType === "ALL" || e.employeeType === employeeType)
    );
    const deptEmpIds = new Set(deptEmployees.map((e) => e.id));
    const deptPayslips = payslips.filter((ps) => {
      if (!deptEmpIds.has(ps.employeeId)) return false;
      if (period !== "ALL" && ps.period !== period) return false;
      return true;
    });

    const totalGross = deptPayslips.reduce((s, p) => s + (Number(p.gross) || 0), 0);
    const totalDeductions = deptPayslips.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
    const totalNet = deptPayslips.reduce((s, p) => s + (Number(p.net) || 0), 0);
    const headcount = deptEmployees.filter((e) => e.status === "ACTIVE").length;
    const countForAvg = deptPayslips.length || headcount || 1;
    const averageNet = Math.round(totalNet / countForAvg);

    return {
      department: dept,
      headcount,
      totalGross,
      totalDeductions,
      totalNet,
      averageNet,
    };
  });

  departmentBreakdown.sort((a, b) => b.totalNet - a.totalNet);

  return {
    metrics,
    alerts,
    actionableAlerts,
    activeEmployees,
    presentToday: presentCount,
    pendingRequests: pendingRequestsCount,
    salaryByDepartment,
    salaryTrend,
    attendanceOverview,
    timeOffOverview,
    departmentBreakdown,
    availablePeriods,
    availableDepartments,
    filtersApplied: {
      period,
      department,
      employeeType,
    },
  };
}

function periodToMonthPrefix(period: string): string | null {
  const map: Record<string, string> = {
    "January 2026": "2026-01",
    "February 2026": "2026-02",
    "March 2026": "2026-03",
    "April 2026": "2026-04",
    "May 2026": "2026-05",
    "June 2026": "2026-06",
    "July 2026": "2026-07",
    "August 2026": "2026-08",
    "September 2026": "2026-09",
    "October 2026": "2026-10",
    "November 2026": "2026-11",
    "December 2026": "2026-12",
  };
  return map[period] || null;
}

function formatWarningTitle(type: string): string {
  switch (type) {
    case "MISSING_BANK_DETAILS":
      return "Missing Bank Details";
    case "MISSING_ACTIVE_CONTRACT":
      return "Missing Active Contract";
    case "CONTRACT_NOT_VALID_FOR_PERIOD":
      return "Contract Expired / Invalid for Period";
    case "DUPLICATE_PAYSLIP":
      return "Duplicate Payslip Detected";
    case "INVALID_SALARY_CONFIGURATION":
      return "Invalid Salary Configuration";
    default:
      return "Payroll Warning";
  }
}

export const dashboardService = {
  get: async (filters?: DashboardFilters): Promise<DashboardData> => {
    if (dataMode === "api") {
      const query = new URLSearchParams();
      if (filters?.period) query.set("period", filters.period);
      if (filters?.department) query.set("department", filters.department);
      if (filters?.employeeType) query.set("employeeType", filters.employeeType);
      const url = `/dashboard${query.toString() ? `?${query.toString()}` : ""}`;
      return apiClient<DashboardData>(url);
    }
    return deriveDashboardData(filters);
  },
};
