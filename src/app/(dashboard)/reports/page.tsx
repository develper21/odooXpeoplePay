"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useAttendance,
  useEmployees,
  usePayruns,
  usePayslips,
  useTimeOff,
  useTimeOffAllocations,
  useTimeOffTypes,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { usableAllocationRemaining } from "@/lib/time-off-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import {
  DataTable,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/shared/table";
import { LoadingState } from "@/components/shared/states";

type ReportTab = "payroll" | "department" | "attendance" | "timeoff";

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role;

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>("payroll");

  // Filter States (shared across reports)
  const [period, setPeriod] = useState<string>("ALL");
  const [department, setDepartment] = useState<string>("ALL");
  const [employeeType, setEmployeeType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Queries
  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: payruns = [], isLoading: prLoading } = usePayruns();
  const { data: payslips = [], isLoading: psLoading } = usePayslips();
  const { data: attendance = [], isLoading: attLoading } = useAttendance();
  const { data: timeOffRequests = [], isLoading: torLoading } = useTimeOff();
  const { data: allocations = [], isLoading: allocLoading } =
    useTimeOffAllocations();
  const { data: leaveTypes = [] } = useTimeOffTypes();

  const isLoading =
    authLoading ||
    empLoading ||
    prLoading ||
    psLoading ||
    attLoading ||
    torLoading ||
    allocLoading;

  // Available Filter Options
  const availablePeriods = useMemo(() => {
    const raw = Array.from(new Set(payruns.map((p) => p.period))).filter(
      Boolean,
    );
    return raw.sort((a, b) => b.localeCompare(a));
  }, [payruns]);

  const availableDepartments = useMemo(() => {
    return Array.from(
      new Set(employees.map((e) => e.department).filter(Boolean)),
    ).sort();
  }, [employees]);

  // Reset Filters
  const handleReset = () => {
    setPeriod("ALL");
    setDepartment("ALL");
    setEmployeeType("ALL");
    setSearchQuery("");
  };

  const isFiltered =
    period !== "ALL" ||
    department !== "ALL" ||
    employeeType !== "ALL" ||
    searchQuery.trim() !== "";

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (department !== "ALL" && emp.department !== department) return false;
      if (employeeType !== "ALL" && emp.employeeType !== employeeType)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const num = emp.employeeNumber.toLowerCase();
        const dept = emp.department.toLowerCase();
        if (!fullName.includes(q) && !num.includes(q) && !dept.includes(q))
          return false;
      }
      return true;
    });
  }, [employees, department, employeeType, searchQuery]);

  const filteredEmpIds = useMemo(() => {
    return new Set(filteredEmployees.map((e) => e.id));
  }, [filteredEmployees]);

  const empMap = useMemo(() => {
    return new Map(employees.map((e) => [e.id, e]));
  }, [employees]);

  // 1. Filtered Payruns
  const filteredPayruns = useMemo(() => {
    return payruns.filter((pr) => {
      if (period !== "ALL" && pr.period !== period) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (pr.name || "").toLowerCase();
        const ref = pr.reference.toLowerCase();
        if (!name.includes(q) && !ref.includes(q)) return false;
      }
      return true;
    });
  }, [payruns, period, searchQuery]);

  // 2. Department Salary Aggregation
  const departmentSalaryData = useMemo(() => {
    const deptMap: Record<
      string,
      { headcount: number; gross: number; deductions: number; net: number }
    > = {};

    availableDepartments.forEach((dept) => {
      if (department !== "ALL" && dept !== department) return;
      deptMap[dept] = { headcount: 0, gross: 0, deductions: 0, net: 0 };
    });

    employees.forEach((emp) => {
      if (department !== "ALL" && emp.department !== department) return;
      if (employeeType !== "ALL" && emp.employeeType !== employeeType) return;
      if (!deptMap[emp.department]) {
        deptMap[emp.department] = {
          headcount: 0,
          gross: 0,
          deductions: 0,
          net: 0,
        };
      }
      if (emp.status === "ACTIVE") {
        deptMap[emp.department].headcount += 1;
      }
    });

    payslips.forEach((ps) => {
      if (!filteredEmpIds.has(ps.employeeId)) return false;
      if (period !== "ALL" && ps.period !== period) return false;

      const emp = empMap.get(ps.employeeId);
      if (emp && deptMap[emp.department]) {
        deptMap[emp.department].gross += ps.gross || 0;
        deptMap[emp.department].deductions += ps.deductions || 0;
        deptMap[emp.department].net += ps.net || 0;
      }
    });

    const rows = Object.entries(deptMap)
      .map(([dept, vals]) => {
        const avgNet =
          vals.headcount > 0 ? Math.round(vals.net / vals.headcount) : 0;
        return {
          department: dept,
          headcount: vals.headcount,
          gross: vals.gross,
          deductions: vals.deductions,
          net: vals.net,
          averageNet: avgNet,
        };
      })
      .filter((d) => d.headcount > 0 || d.net > 0);

    return rows.sort((a, b) => b.net - a.net);
  }, [
    availableDepartments,
    department,
    employeeType,
    employees,
    payslips,
    filteredEmpIds,
    period,
    empMap,
  ]);

  // 3. Filtered Attendance Aggregated by Employee
  const attendanceReportData = useMemo(() => {
    const map: Record<
      string,
      {
        employeeId: string;
        name: string;
        department: string;
        present: number;
        late: number;
        absent: number;
        overtime: number;
        missingCheckout: number;
        total: number;
      }
    > = {};

    filteredEmployees.forEach((emp) => {
      map[emp.id] = {
        employeeId: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        present: 0,
        late: 0,
        absent: 0,
        overtime: 0,
        missingCheckout: 0,
        total: 0,
      };
    });

    attendance.forEach((att) => {
      if (!map[att.employeeId]) return;
      if (period !== "ALL") {
        const monthPrefix = periodToMonthPrefix(period);
        if (monthPrefix && !att.date.startsWith(monthPrefix)) return;
      }

      const row = map[att.employeeId];
      row.total += 1;
      if (att.status === "PRESENT") row.present += 1;
      else if (att.status === "LATE") row.late += 1;
      else if (att.status === "ABSENT") row.absent += 1;
      else if (att.status === "OVERTIME") row.overtime += 1;
      else if (att.status === "MISSING_CHECKOUT") row.missingCheckout += 1;
    });

    return Object.values(map);
  }, [filteredEmployees, attendance, period]);

  // 4. Time Off Analysis
  const timeOffReportData = useMemo(() => {
    return filteredEmployees.map((emp) => {
      const empReqs = timeOffRequests.filter((r) => {
        if (r.employeeId !== emp.id) return false;
        if (period !== "ALL") {
          const monthPrefix = periodToMonthPrefix(period);
          if (
            monthPrefix &&
            !r.startDate.startsWith(monthPrefix) &&
            !r.endDate.startsWith(monthPrefix)
          ) {
            return false;
          }
        }
        return true;
      });

      const approvedDays = empReqs
        .filter((r) => r.status === "APPROVED")
        .reduce((s, r) => s + (Number(r.days) || 0), 0);
      const pendingDays = empReqs
        .filter((r) => r.status === "PENDING")
        .reduce((s, r) => s + (Number(r.days) || 0), 0);
      const refusedDays = empReqs
        .filter((r) => r.status === "REFUSED")
        .reduce((s, r) => s + (Number(r.days) || 0), 0);

      const empAllocs = allocations.filter((a) => a.employeeId === emp.id);
      const remainingQuota = empAllocs.reduce(
        (s, a) => s + usableAllocationRemaining(a),
        0,
      );
      const totalQuota = empAllocs
        .filter((a) => a.status === "APPROVED" || a.status === "ACTIVE")
        .reduce((s, a) => s + (Number(a.allocatedDays) || 0), 0);

      return {
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        requestedDays: approvedDays + pendingDays + refusedDays,
        approvedDays,
        pendingDays,
        refusedDays,
        remainingQuota,
        totalQuota,
      };
    });
  }, [filteredEmployees, timeOffRequests, allocations, period]);

  // Export CSV Handler
  const handleExportCsv = () => {
    if (activeTab === "payroll") {
      const headers = [
        "Reference",
        "Name",
        "Period",
        "Employees",
        "Gross",
        "Deductions",
        "Net",
        "Status",
      ];
      const rows = filteredPayruns.map((pr) => [
        pr.reference,
        pr.name || "",
        pr.period,
        pr.employeeCount,
        pr.grossTotal,
        pr.deductionsTotal || 0,
        pr.netTotal,
        pr.status,
      ]);
      downloadCsv("Payroll_Summary_Report", headers, rows);
    } else if (activeTab === "department") {
      const headers = [
        "Department",
        "Headcount",
        "Gross Total",
        "Deductions",
        "Net Total",
        "Average Net",
      ];
      const rows = departmentSalaryData.map((d) => [
        d.department,
        d.headcount,
        d.gross,
        d.deductions,
        d.net,
        d.averageNet,
      ]);
      downloadCsv("Department_Salary_Report", headers, rows);
    } else if (activeTab === "attendance") {
      const headers = [
        "Employee ID",
        "Name",
        "Department",
        "Present",
        "Late",
        "Absent",
        "Overtime",
        "Missing Checkout",
        "Rate %",
      ];
      const rows = attendanceReportData.map((a) => [
        a.employeeId,
        a.name,
        a.department,
        a.present,
        a.late,
        a.absent,
        a.overtime,
        a.missingCheckout,
        a.total > 0
          ? `${Math.round(((a.present + a.overtime) / a.total) * 100)}%`
          : "N/A",
      ]);
      downloadCsv("Attendance_Analysis_Report", headers, rows);
    } else if (activeTab === "timeoff") {
      const headers = [
        "Employee ID",
        "Name",
        "Department",
        "Requested (d)",
        "Approved (d)",
        "Pending (d)",
        "Refused (d)",
        "Remaining Quota",
      ];
      const rows = timeOffReportData.map((t) => [
        t.employeeNumber,
        t.name,
        t.department,
        t.requestedDays,
        t.approvedDays,
        t.pendingDays,
        t.refusedDays,
        t.remainingQuota,
      ]);
      downloadCsv("Time_Off_Analysis_Report", headers, rows);
    }
  };

  if (isLoading) return <LoadingState />;

  // RBAC Guard
  if (!role || !canAccess(role, "reports.read")) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-danger/10 p-4 text-danger">
          <ShieldAlert className="size-10" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-text-primary">
          Reports Access Restricted
        </h2>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Company-wide analytical reports are restricted to authorized HR &
          Payroll management roles. Your account role is{" "}
          <strong className="text-text-primary">{role || "EMPLOYEE"}</strong>.
        </p>
        <div className="mt-6">
          <Link href="/dashboard">
            <Button size="sm">Back to Workspace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Analytical Reports
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Cross-module payroll, department expenditure, attendance health, and
            leave analysis
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          variant="secondary"
          size="sm"
          className="gap-1.5"
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border-subtle pb-3">
        <button
          onClick={() => setActiveTab("payroll")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "payroll"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Wallet className="size-3.5" />
          <span>Payroll Summary</span>
          <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
            {filteredPayruns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("department")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "department"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Building2 className="size-3.5" />
          <span>Department Salary</span>
          <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
            {departmentSalaryData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "attendance"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Clock className="size-3.5" />
          <span>Attendance Analysis</span>
          <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
            {attendanceReportData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("timeoff")}
          className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "timeoff"
              ? "bg-primary text-white"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          }`}
        >
          <Calendar className="size-3.5" />
          <span>Time Off Analysis</span>
          <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
            {timeOffReportData.length}
          </span>
        </button>
      </div>

      {/* Shared Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface/50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface py-1.5 pl-8 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Periods</option>
            {availablePeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {availableDepartments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Employee Type Filter */}
          <select
            value={employeeType}
            onChange={(e) => setEmployeeType(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Employment Types</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </div>

        <Button
          onClick={handleReset}
          variant="secondary"
          size="sm"
          disabled={!isFiltered}
          className="h-8 gap-1 text-xs"
        >
          <RotateCcw className="size-3" /> Reset
        </Button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Tab 1: Payroll Summary Report */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "payroll" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Payroll Cycle Summary</CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Official payruns with employee counts, gross earnings, and net
              disbursements
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable>
              <TableHeader>
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Payrun Name</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right">Headcount</th>
                  <th className="px-4 py-3 text-right">Gross Total</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </TableHeader>
              <tbody>
                {filteredPayruns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-text-muted"
                      aria-colspan={9}
                    >
                      No payruns found matching the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayruns.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {pr.reference || `PR-${String(pr.id).padStart(3, "0")}`}
                      </TableCell>
                      <TableCell className="font-medium text-text-primary">
                        {pr.name || "Regular Payroll"}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {pr.period || (pr.periodStart ? `${pr.periodStart} → ${pr.periodEnd}` : "Regular Cycle")}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-semibold text-text-secondary">
                          {pr.employeeCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-text-secondary">
                        ₹{(Number(pr.grossTotal) || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-danger/80">
                        ₹{(Number(pr.deductionsTotal) || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-text-primary">
                        ₹{(Number(pr.netTotal) || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={pr.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/payroll/${pr.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View Payrun
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Tab 2: Department Salary Report */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "department" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Department Payroll Analysis</CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Departmental breakdown of compensation costs, average wage per
              employee, and headcount
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable>
              <TableHeader>
                <tr>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-right">Active Headcount</th>
                  <th className="px-4 py-3 text-right">Gross Compensation</th>
                  <th className="px-4 py-3 text-right">Total Deductions</th>
                  <th className="px-4 py-3 text-right">Net Disbursement</th>
                  <th className="px-4 py-3 text-right">
                    Average Net / Employee
                  </th>
                </tr>
              </TableHeader>
              <tbody>
                {departmentSalaryData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-text-muted"
                      aria-colspan={6}
                    >
                      No department data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  departmentSalaryData.map((d) => (
                    <TableRow key={d.department}>
                      <TableCell className="font-semibold text-text-primary">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-primary" />
                          <span>{d.department}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-semibold text-text-secondary">
                          {d.headcount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-text-secondary">
                        ₹{d.gross.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-danger/80">
                        ₹{d.deductions.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-text-primary">
                        ₹{d.net.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-text-muted">
                        ₹{d.averageNet.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Tab 3: Attendance Analysis Report */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Attendance Health & Exception Report</CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Individual attendance records, lateness, overtime hours, and
              missing checkouts
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable>
              <TableHeader>
                <tr>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Employee Name</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-right">Present</th>
                  <th className="px-4 py-3 text-right">Late</th>
                  <th className="px-4 py-3 text-right">Absent</th>
                  <th className="px-4 py-3 text-right">Overtime</th>
                  <th className="px-4 py-3 text-right">Missing Checkout</th>
                  <th className="px-4 py-3 text-right">Health Rate</th>
                </tr>
              </TableHeader>
              <tbody>
                {attendanceReportData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-text-muted"
                      aria-colspan={9}
                    >
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceReportData.map((att) => {
                    const health =
                      att.total > 0
                        ? Math.round(
                            ((att.present + att.overtime) / att.total) * 100,
                          )
                        : 100;
                    return (
                      <TableRow key={att.employeeId}>
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {att.employeeId}
                        </TableCell>
                        <TableCell className="font-medium text-text-primary">
                          {att.name}
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">
                          {att.department}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-success">
                          {att.present}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-warning">
                          {att.late}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-danger">
                          {att.absent}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-primary">
                          {att.overtime}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-amber-500">
                          {att.missingCheckout}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold ${
                              health >= 90
                                ? "bg-success/10 text-success"
                                : health >= 75
                                  ? "bg-warning/10 text-warning"
                                  : "bg-danger/10 text-danger"
                            }`}
                          >
                            {health}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </tbody>
            </DataTable>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Tab 4: Time Off Analysis Report */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "timeoff" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Time Off Quota & Request Analysis</CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Leaves requested, approved vs refused, and current remaining
              balance per employee
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable>
              <TableHeader>
                <tr>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Employee Name</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-right">Requested</th>
                  <th className="px-4 py-3 text-right">Approved</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Refused</th>
                  <th className="px-4 py-3 text-right">Remaining Quota</th>
                </tr>
              </TableHeader>
              <tbody>
                {timeOffReportData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-text-muted"
                      aria-colspan={8}
                    >
                      No time-off records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  timeOffReportData.map((t) => (
                    <TableRow key={t.employeeNumber}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {t.employeeNumber}
                      </TableCell>
                      <TableCell className="font-medium text-text-primary">
                        {t.name}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {t.department}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-text-primary">
                        {t.requestedDays} d
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-success">
                        {t.approvedDays} d
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-warning">
                        {t.pendingDays} d
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-danger">
                        {t.refusedDays} d
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-bold text-primary">
                          {t.remainingQuota} / {t.totalQuota} d
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          </CardContent>
        </Card>
      )}
    </div>
  );
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

function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
