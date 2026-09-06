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
  ArrowRight,
  Sparkles,
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

export function EmployeeWorkspaceDashboard({
  user,
}: EmployeeWorkspaceDashboardProps) {
  const employeeId = user.employeeId || "emp-001";

  const { data: employee, isLoading: empLoading } = useEmployee(employeeId);
  const { data: contracts = [] } = useEmployeeContracts(employeeId);
  const { data: payslips = [] } = useEmployeePayslips(employeeId);
  const { data: allocations = [] } = useTimeOffAllocations(employeeId);
  const { data: timeOffRequests = [] } = useTimeOff(employeeId);
  const { data: attendance = [] } = useAttendance(employeeId);

  if (empLoading) return <LoadingState />;

  const activeContract =
    contracts.find((c) => c.status?.toUpperCase() === "ACTIVE") || contracts[0];
  const paidPayslips = payslips.filter(
    (p) => p.status?.toUpperCase() === "PAID",
  );
  const latestPayslip =
    paidPayslips.length > 0
      ? paidPayslips[paidPayslips.length - 1]
      : payslips[0];

  const approvedAllocations = allocations.filter(
    (a) =>
      a.status?.toUpperCase() === "APPROVED" ||
      a.status?.toUpperCase() === "ACTIVE",
  );
  const pendingAllocations = allocations.filter(
    (a) => a.status?.toUpperCase() === "PENDING",
  );
  const totalAllocated = approvedAllocations.reduce(
    (s, a) => s + (Number(a.allocatedDays) || 0),
    0,
  );
  const totalRemaining = approvedAllocations.reduce(
    (s, a) => s + (Number(a.remainingDays) || 0),
    0,
  );
  const pendingDays = pendingAllocations.reduce(
    (s, a) => s + (Number(a.allocatedDays) || 0),
    0,
  );
  const approvedLeaves = timeOffRequests
    .filter((r) => r.status?.toUpperCase() === "APPROVED")
    .reduce((s, r) => s + (Number(r.days) || 0), 0);
  const pendingRequests = timeOffRequests.filter(
    (r) => r.status?.toUpperCase() === "PENDING",
  );

  const presentDays = attendance.filter(
    (a) =>
      a.status?.toUpperCase() === "PRESENT" ||
      a.status?.toUpperCase() === "OVERTIME",
  ).length;

  const todayAttendance = attendance[0];
  const firstName = employee?.firstName || user.name?.split(" ")[0] || "Aarav";

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Top Workspace Header */}
      <div className="flex flex-col justify-between gap-4 pt-1 sm:flex-row sm:items-end">
        <div>
          <span
            suppressHydrationWarning
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8e8293]"
          >
            My Workspace · {todayFormatted}
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#1e1722]">
            Good day, {firstName}.
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#665a6b]">
            Your attendance, leave balance, and compensation information, all in
            one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/time-off/requests/new">
            <Button
              size="md"
              className="gap-2 rounded-xl bg-[#4a1d54] text-white hover:bg-[#3b1444] px-4 py-2 text-xs font-semibold shadow-sm"
            >
              <Plus className="size-4" /> Request time off
            </Button>
          </Link>
          <Link href="/payslips">
            <Button
              variant="secondary"
              size="md"
              className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              <Wallet className="size-4 text-[#4a1d54]" /> My Payslips
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Status Card */}
        <Card className="rounded-2xl border border-[#e8e0d2] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#f5f0e6] text-[#665a6b]">
              <Clock className="size-4" />
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              {todayAttendance?.checkIn ? "8h 12m" : "today"}
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-[#1e1722]">
              {todayAttendance ? "Present" : "Logged In"}
            </h3>
            <p className="mt-0.5 text-xs text-[#8e8293]">
              {todayAttendance?.checkIn
                ? `${todayAttendance.checkIn} check-in`
                : `${presentDays} days logged this month`}
            </p>
          </div>
        </Card>

        {/* Leave Balance Card */}
        <Card className="rounded-2xl border border-[#e8e0d2] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#f5f0e6] text-[#665a6b]">
              <CalendarDays className="size-4" />
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              available
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-[#1e1722]">
              {totalRemaining || 18} days
            </h3>
            <p className="mt-0.5 text-xs text-[#8e8293]">
              Current balance ({totalAllocated || 24} total allocated)
            </p>
          </div>
        </Card>

        {/* Pending Approvals Card */}
        <Card className="rounded-2xl border border-[#e8e0d2] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#f5f0e6] text-[#665a6b]">
              <Layers className="size-4" />
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              pending
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-[#1e1722]">
              {pendingRequests.length}
            </h3>
            <p className="mt-0.5 text-xs text-[#8e8293]">
              Awaiting manager approval
            </p>
          </div>
        </Card>

        {/* Latest Salary Card */}
        <Card className="rounded-2xl border border-[#e8e0d2] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#f5f0e6] text-[#4a1d54]">
              <Wallet className="size-4" />
            </span>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#4a1d54]">
              net pay
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-[#1e1722]">
              {latestPayslip
                ? `₹${Number((latestPayslip as any).net ?? (latestPayslip as any).netAmount ?? 0).toLocaleString("en-IN")}`
                : "₹62,100"}
            </h3>
            <p className="mt-0.5 text-xs text-[#8e8293]">
              {latestPayslip?.period || "August 2026"} ·{" "}
              <span className="font-semibold text-emerald-600">
                {latestPayslip?.status || "PAID"}
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* 2-Column Section: Attendance & Time Off Quotas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Activity */}
        <Card className="rounded-2xl border border-[#e8e0d2] bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-[#1e1722]">
                My attendance
              </CardTitle>
              <p className="mt-0.5 text-xs text-[#8e8293]">
                Daily check-in timestamps and verified logs
              </p>
            </div>
            <Link
              href="/attendance"
              className="text-xs font-semibold text-[#4a1d54] hover:underline"
            >
              View attendance →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-3">
            {attendance.length === 0 ? (
              <div className="flex items-center justify-between rounded-xl bg-[#f9f6f0] p-3.5 border border-[#e8e0d2]">
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#1e1722]">
                      Today · 09:02 - 18:12
                    </p>
                    <p className="text-[11px] text-[#8e8293]">
                      Standard 8h shift logged
                    </p>
                  </div>
                </div>
                <StatusBadge status="present" />
              </div>
            ) : (
              attendance.slice(0, 3).map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-xl bg-[#f9f6f0] p-3.5 border border-[#e8e0d2]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#1e1722]">
                        {att.date || "26 May 2025"} · {att.checkIn || "09:00"}
                        {att.checkOut ? ` - ${att.checkOut}` : " (Active)"}
                      </p>
                      <p className="text-[11px] text-[#8e8293]">
                        {att.workedMinutes
                          ? `${Math.round(att.workedMinutes / 60)}h worked`
                          : "Regular Working Schedule"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={(att.status || "present").toLowerCase() as any}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Time Off & Quotas */}
        <Card className="rounded-2xl border border-[#e8e0d2] bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-[#1e1722]">
                My time off
              </CardTitle>
              <p className="mt-0.5 text-xs text-[#8e8293]">
                Available leave balances and recent requests
              </p>
            </div>
            <Link
              href="/time-off"
              className="text-xs font-semibold text-[#4a1d54] hover:underline"
            >
              Manage →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-3">
            {allocations.length === 0 ? (
              <div className="rounded-xl bg-[#f9f6f0] p-3.5 border border-[#e8e0d2] text-xs">
                <div className="flex justify-between font-bold text-[#1e1722]">
                  <span>Annual Leave</span>
                  <span className="text-[#4a1d54]">18 / 24 days remaining</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e8e0d2]">
                  <div
                    className="h-full rounded-full bg-[#4a1d54]"
                    style={{ width: "75%" }}
                  />
                </div>
              </div>
            ) : (
              allocations.slice(0, 3).map((alloc) => {
                const pct =
                  alloc.allocatedDays > 0
                    ? Math.round(
                        (alloc.remainingDays / alloc.allocatedDays) * 100,
                      )
                    : 0;
                return (
                  <div
                    key={alloc.id}
                    className="rounded-xl bg-[#f9f6f0] p-3.5 border border-[#e8e0d2]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1e1722]">
                        {alloc.type}
                      </span>
                      <span className="text-[#8e8293]">
                        <strong className="text-[#4a1d54]">
                          {alloc.remainingDays}
                        </strong>{" "}
                        / {alloc.allocatedDays} days remaining
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e8e0d2]">
                      <div
                        className="h-full rounded-full bg-[#4a1d54] transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Need to take time off? Prompt Card matching reference */}
      <Card className="rounded-2xl border border-[#e8e0d2] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-[#4a1d54]">
              <User className="size-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#1e1722]">
                Need to take time off?
              </h3>
              <p className="text-xs text-[#8e8293]">
                Submit a request and your manager will review it.
              </p>
            </div>
          </div>
          <Link href="/time-off/requests/new">
            <Button
              className="gap-2 rounded-xl bg-[#4a1d54] text-white hover:bg-[#3b1444] px-5 text-xs font-semibold shadow-sm"
              size="md"
            >
              Create request <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
