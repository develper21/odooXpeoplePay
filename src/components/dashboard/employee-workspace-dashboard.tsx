"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Layers,
  Plus,
  Printer,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  useEmployee,
  useEmployeeContracts,
  useEmployeePayslips,
  useTimeOff,
  useTimeOffAllocations,
  useAttendance,
} from "@/hooks/use-data";
import { LoadingState } from "@/components/shared/states";
import type { AuthUser } from "@/lib/auth/auth-types";

interface EmployeeWorkspaceDashboardProps {
  user: AuthUser;
}

export function EmployeeWorkspaceDashboard({ user }: EmployeeWorkspaceDashboardProps) {
  const employeeId = user.employeeId || "emp-001";

  const { data: employee, isLoading: empLoading } = useEmployee(employeeId);
  const { data: contracts = [] } = useEmployeeContracts(employeeId);
  const { data: payslips = [] } = useEmployeePayslips(employeeId);
  const { data: allocations = [] } = useTimeOffAllocations(employeeId);
  const { data: timeOffRequests = [] } = useTimeOff(employeeId);
  const { data: attendance = [] } = useAttendance(employeeId);

  if (empLoading) return <LoadingState />;

  const activeContract = contracts.find((c) => c.status === "ACTIVE") || contracts[0];
  const paidPayslips = payslips.filter((p) => p.status === "PAID");
  const latestPayslip = paidPayslips.length > 0 ? paidPayslips[paidPayslips.length - 1] : payslips[0];

  const totalAllocated = allocations.reduce((s, a) => s + (a.allocatedDays || 0), 0);
  const totalRemaining = allocations.reduce((s, a) => s + (a.remainingDays || 0), 0);
  const approvedLeaves = timeOffRequests
    .filter((r) => r.status === "APPROVED")
    .reduce((s, r) => s + (r.days || 0), 0);
  const pendingRequests = timeOffRequests.filter((r) => r.status === "PENDING");

  const presentDays = attendance.filter((a) => a.status === "PRESENT" || a.status === "OVERTIME").length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface to-surface p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary">
              Welcome back, {employee?.firstName || user.name}!
            </h1>
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Employee Workspace
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {employee?.position || "Team Member"} · {employee?.department || "Engineering"} · ID: {employee?.employeeNumber || "EMP-001"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/time-off/requests/new">
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="size-3.5" /> Request Time Off
            </Button>
          </Link>
          <Link href="/payslips">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <Wallet className="size-3.5" /> My Payslips
            </Button>
          </Link>
        </div>
      </div>

      {/* Personal KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Latest Net Pay */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary">Latest Net Salary Paid</p>
            <span className="rounded-md bg-surface-raised p-2 text-primary">
              <Wallet className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-text-primary">
            {latestPayslip ? `₹${latestPayslip.net.toLocaleString("en-IN")}` : "₹0"}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Period: {latestPayslip?.period || "Latest"} · Status:{" "}
            <span className="font-semibold text-success">{latestPayslip?.status || "PENDING"}</span>
          </p>
        </Card>

        {/* Leave Balance */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary">Leave Balance Available</p>
            <span className="rounded-md bg-surface-raised p-2 text-primary">
              <Layers className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-text-primary">
            {totalRemaining} <span className="text-xs font-normal text-text-muted">/ {totalAllocated} days</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {totalAllocated - totalRemaining} days utilized this year
          </p>
        </Card>

        {/* Approved Leaves */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary">Approved Leaves</p>
            <span className="rounded-md bg-surface-raised p-2 text-success">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-text-primary">
            {approvedLeaves} <span className="text-xs font-normal text-text-muted">days</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {pendingRequests.length} pending request(s) awaiting approval
          </p>
        </Card>

        {/* Attendance Days */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary">Logged Attendance</p>
            <span className="rounded-md bg-surface-raised p-2 text-warning">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-text-primary">
            {presentDays} <span className="text-xs font-normal text-text-muted">days present</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {attendance.length} total logged check-ins
          </p>
        </Card>
      </div>

      {/* Main Grid: My Payslips & Leave Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payslips */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>My Recent Payslips</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                View, download, and print your itemized salary statements
              </p>
            </div>
            <Link href="/payslips" className="text-xs font-medium text-primary hover:underline">
              All Payslips
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {payslips.length === 0 ? (
              <p className="py-6 text-center text-xs text-text-muted">No payslips generated yet.</p>
            ) : (
              payslips.slice(-4).reverse().map((ps) => (
                <div
                  key={ps.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-raised/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-primary/10 p-2 text-primary">
                      <FileText className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{ps.period || "Payroll Period"}</p>
                      <p className="text-[11px] text-text-muted">
                        Ref: {ps.reference} · Net: ₹{ps.net.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ps.status.toLowerCase() as any} />
                    <Link href={`/payslips/${ps.id}`}>
                      <Button variant="secondary" size="sm" className="h-7 gap-1 px-2 text-[11px]">
                        <Printer className="size-3" /> View & Print
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Leave Allocations & Balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>My Leave Quotas</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Annual allocation, consumed days, and remaining balance
              </p>
            </div>
            <Link href="/time-off" className="text-xs font-medium text-primary hover:underline">
              Leave Details
            </Link>
          </CardHeader>
          <CardContent className="space-y-3.5 p-4 pt-0">
            {allocations.length === 0 ? (
              <p className="py-6 text-center text-xs text-text-muted">No allocations assigned.</p>
            ) : (
              allocations.map((alloc) => {
                const pct = alloc.allocatedDays > 0 ? Math.round((alloc.usedDays / alloc.allocatedDays) * 100) : 0;
                return (
                  <div key={alloc.id} className="rounded-lg border border-border-subtle bg-surface p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-primary">{alloc.type}</span>
                      <span className="text-text-muted">
                        <strong className="text-primary">{alloc.remainingDays}</strong> / {alloc.allocatedDays} days remaining
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted">
                      <span>{alloc.usedDays} days taken</span>
                      <span>Valid until {alloc.validTo}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Employment Contract Card */}
      {activeContract && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Current Employment Contract</CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Official contract reference and terms of service
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border-subtle bg-surface p-3">
              <span className="text-[11px] text-text-muted">Contract Reference</span>
              <p className="mt-1 text-xs font-bold text-text-primary">{activeContract.reference}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface p-3">
              <span className="text-[11px] text-text-muted">Base Monthly Wage</span>
              <p className="mt-1 text-xs font-bold text-primary">₹{activeContract.monthlySalary.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface p-3">
              <span className="text-[11px] text-text-muted">Effective Dates</span>
              <p className="mt-1 text-xs font-medium text-text-secondary">
                {activeContract.startDate} to {activeContract.endDate || "Ongoing"}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface p-3">
              <span className="text-[11px] text-text-muted">Status</span>
              <div className="mt-1">
                <StatusBadge status={activeContract.status.toLowerCase() as any} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
