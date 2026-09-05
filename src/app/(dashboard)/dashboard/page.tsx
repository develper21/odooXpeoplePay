"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboard } from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DashboardFiltersBar } from "@/components/dashboard/dashboard-filters";
import { SalaryChart } from "@/components/dashboard/salary-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { OperationalAlerts } from "@/components/dashboard/operational-alerts";
import { AttendanceOverview } from "@/components/dashboard/attendance-overview";
import { TimeOffOverview } from "@/components/dashboard/time-off-overview";
import { DepartmentBreakdown } from "@/components/dashboard/department-breakdown";
import { EmployeeWorkspaceDashboard } from "@/components/dashboard/employee-workspace-dashboard";
import type { DashboardFilters } from "@/types/domain";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role;

  const [filters, setFilters] = useState<DashboardFilters>({
    period: "September 2026",
    department: "ALL",
    employeeType: "ALL",
  });

  const { data, isLoading, isError, error } = useDashboard(filters);

  if (authLoading || isLoading) return <LoadingState />;

  // If logged-in user is an EMPLOYEE, render secure employee portal workspace
  if (role === "EMPLOYEE" && user) {
    return <EmployeeWorkspaceDashboard user={user} />;
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message || "Failed to load dashboard data."} />;
  }

  const canCreatePayrun = role ? canAccess(role, "payrun.create") : false;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Payroll Dashboard</h1>
          <p className="mt-1 text-sm text-text-muted">
            Aggregated operational intelligence for payments, staffing, attendance health, and compliance
          </p>
        </div>

        {canCreatePayrun && (
          <Link href="/payroll/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" /> Create Payrun
            </Button>
          </Link>
        )}
      </div>

      {/* Centralized Filter Bar */}
      <DashboardFiltersBar
        filters={filters}
        onChange={setFilters}
        availablePeriods={data.availablePeriods}
        availableDepartments={data.availableDepartments}
      />

      {/* Top 5 KPI Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        <SalaryChart data={data.salaryByDepartment} />
        <TrendChart data={data.salaryTrend} />
      </div>

      {/* Operational Alerts */}
      <OperationalAlerts alerts={data.actionableAlerts} />

      {/* Attendance & Time Off Overviews */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AttendanceOverview overview={data.attendanceOverview} />
        <TimeOffOverview overview={data.timeOffOverview} />
      </div>

      {/* Department Breakdown Table */}
      <DepartmentBreakdown breakdown={data.departmentBreakdown} />
    </div>
  );
}
