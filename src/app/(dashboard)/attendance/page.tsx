"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, LogIn, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAttendance, useEmployees, useSchedules } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { attendanceService } from "@/lib/services";
import { employeeName } from "@/lib/hr-utils";
import { formatDuration, calculateWorkedMinutes } from "@/lib/time-utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "@/components/shared/states";
import { canAccess } from "@/lib/permissions";
import { matchesEmployee } from "@/lib/utils";

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const ownEmployeeId = user?.role === "EMPLOYEE" ? user.employeeId : undefined;
  const {
    data: records = [],
    isLoading,
    isError,
  } = useAttendance(ownEmployeeId);
  const { data: employees = [] } = useEmployees();
  const { data: schedules = [] } = useSchedules();

  const [clockLoading, setClockLoading] = useState(false);
  const [clockMessage, setClockMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [employeeId, setEmployeeId] = useState("ALL");
  const [range, setRange] = useState("ALL");

  const now = new Date("2026-09-05T12:00:00");
  const fromDate =
    range === "TODAY"
      ? "2026-09-05"
      : range === "WEEK"
        ? "2026-08-31"
        : range === "MONTH"
          ? "2026-09-01"
          : "";

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const employee = employees.find((item) =>
        matchesEmployee(item.id, record.employeeId),
      );
      const haystack =
        `${employeeName(employee)} ${employee?.employeeNumber ?? ""}`.toLowerCase();
      return (
        haystack.includes(search.toLowerCase()) &&
        (status === "ALL" ||
          record.status?.toUpperCase() === status.toUpperCase()) &&
        (employeeId === "ALL" ||
          matchesEmployee(record.employeeId, employeeId)) &&
        (!fromDate || record.date >= fromDate) &&
        (!fromDate || record.date <= now.toISOString().slice(0, 10))
      );
    });
  }, [employeeId, employees, fromDate, now, records, search, status]);

  const handleClockIn = async () => {
    setClockLoading(true);
    setClockMessage(null);
    try {
      await attendanceService.checkIn(user?.employeeId);
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setClockMessage("Successfully clocked in!");
    } catch (err: any) {
      setClockMessage(err.message || "Failed to clock in.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    setClockMessage(null);
    try {
      await attendanceService.checkOut(user?.employeeId);
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setClockMessage("Successfully clocked out!");
    } catch (err: any) {
      setClockMessage(err.message || "Failed to clock out.");
    } finally {
      setClockLoading(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Attendance could not be loaded." />;

  const canCreate = Boolean(user && canAccess(user.role, "attendance.create"));

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Monitor actual employee presence and attendance corrections."
        action={
          canCreate
            ? { label: "Add Attendance", href: "/attendance/new" }
            : undefined
        }
      />

      {/* Quick Clock-In / Clock-Out bar */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 border-primary/20 bg-primary/5 p-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Personal Attendance Kiosk
          </h3>
          <p className="text-xs text-text-muted">
            Record today&apos;s timestamp as {user?.name || "Active User"}.
          </p>
          {clockMessage && (
            <p className="mt-1 text-xs font-medium text-primary">
              {clockMessage}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleClockIn}
            disabled={clockLoading}
            className="gap-1.5"
          >
            <LogIn className="size-4" />
            Check In
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClockOut}
            disabled={clockLoading}
            className="gap-1.5"
          >
            <LogOut className="size-4" />
            Check Out
          </Button>
        </div>
      </Card>

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee or code..."
              className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-lg border border-border bg-surface-raised pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors"
          >
            <option value="ALL">All statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
            <option value="OVERTIME">Overtime</option>
            <option value="MISSING_CHECKOUT">Missing checkout</option>
            <option value="MANUAL_EDIT">Manual edit</option>
          </select>
          {!ownEmployeeId && (
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-raised pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors max-w-[200px] truncate"
            >
              <option value="ALL">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeName(employee)}
                </option>
              ))}
            </select>
          )}
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="h-10 rounded-lg border border-border bg-surface-raised pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors"
          >
            <option value="ALL">All dates</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">This week</option>
            <option value="MONTH">This month</option>
          </select>
          <button
            onClick={() => {
              setSearch("");
              setStatus("ALL");
              setEmployeeId("ALL");
              setRange("ALL");
            }}
            className="h-10 rounded-md px-3 text-xs text-text-secondary hover:bg-surface-raised"
          >
            Reset
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No attendance records found"
          message="Try changing the filters or add an attendance record."
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Check in</TableCell>
              <TableCell>Check out</TableCell>
              <TableCell>Worked hours</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filtered.map((record) => {
              const employee = employees.find(
                (item) => item.id === record.employeeId,
              );
              const schedule = schedules.find(
                (item) => item.id === employee?.scheduleId,
              );
              const worked =
                record.workedMinutes ??
                calculateWorkedMinutes(
                  record.checkIn,
                  record.checkOut,
                  record.breakMinutes,
                );
              return (
                <TableRow key={record.id}>
                  <TableCell>
                    <Link
                      href={`/employees/${record.employeeId}`}
                      className="font-medium hover:text-primary"
                    >
                      {employeeName(employee)}
                      <span className="mt-1 block text-xs text-text-muted">
                        {employee?.employeeNumber}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-text-secondary">
                    {record.date}
                  </TableCell>
                  <TableCell>{record.checkIn || "—"}</TableCell>
                  <TableCell>{record.checkOut || "—"}</TableCell>
                  <TableCell className="font-semibold">
                    {formatDuration(worked)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        record.status.toLowerCase() as
                          | "present"
                          | "late"
                          | "absent"
                          | "overtime"
                          | "missing_checkout"
                          | "manual_edit"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/attendance/${record.id}`}
                      className="text-xs text-primary"
                    >
                      View
                    </Link>
                    {schedule && (
                      <span className="ml-2 text-[10px] text-text-muted">
                        {schedule.name}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
