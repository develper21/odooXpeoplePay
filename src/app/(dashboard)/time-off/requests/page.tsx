"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useTimeOff, useEmployees, useTimeOffTypes } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { formatTimeOffDate } from "@/lib/time-off-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { DataTable, TableCell, TableHeader, TableRow } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TimeOffTabs } from "@/components/time-off/time-off-tabs";

export default function TimeOffRequestsPage() {
  const { user } = useAuth();
  const isEmployeeRole = user?.role === "EMPLOYEE";
  const currentUserEmpId = user?.employeeId ?? "emp-001";

  const { data: requests = [], isLoading, isError } = useTimeOff(
    isEmployeeRole ? currentUserEmpId : undefined
  );
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useTimeOffTypes();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      const emp = employees.find((e) => e.id === req.employeeId);
      const name = emp ? employeeName(emp).toLowerCase() : "";
      const code = emp ? emp.employeeNumber.toLowerCase() : "";
      const matchSearch =
        name.includes(search.toLowerCase()) ||
        code.includes(search.toLowerCase()) ||
        req.type.toLowerCase().includes(search.toLowerCase()) ||
        req.reason.toLowerCase().includes(search.toLowerCase());

      const matchType =
        typeFilter === "ALL" ||
        req.typeId === typeFilter ||
        req.type.toLowerCase() === typeFilter.toLowerCase();

      const matchStatus = statusFilter === "ALL" || req.status === statusFilter;

      const matchEmployee =
        employeeFilter === "ALL" || req.employeeId === employeeFilter;

      return matchSearch && matchType && matchStatus && matchEmployee;
    });
  }, [requests, employees, search, typeFilter, statusFilter, employeeFilter]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Time Off requests could not be loaded." />;

  const canCreate = Boolean(user && canAccess(user.role, "timeoff.create"));

  return (
    <>
      <PageHeader
        title="Time Off Requests"
        description="Review, search, and manage leave requests."
        action={
          canCreate
            ? { label: "New Request", href: "/time-off/requests/new" }
            : undefined
        }
      />

      <TimeOffTabs />

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, type, or reason..."
              className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REFUSED">Refused</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary"
          >
            <option value="ALL">All Leave Types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {!isEmployeeRole && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary"
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("ALL");
              setStatusFilter("ALL");
              setEmployeeFilter("ALL");
            }}
            className="h-10 rounded-md px-3 text-xs text-text-secondary hover:bg-surface-raised"
          >
            Reset
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No requests found" message="Try adjusting search or filters, or submit a new request." />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filtered.map((req) => {
              const emp = employees.find((e) => e.id === req.employeeId);
              const unitLabel = req.unit === "HOURS" ? "hrs" : "days";
              return (
                <TableRow key={req.id}>
                  <TableCell>
                    <Link href={`/employees/${req.employeeId}`} className="font-semibold hover:text-primary">
                      {emp ? employeeName(emp) : req.employeeId}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">{req.type}</TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {formatTimeOffDate(req.startDate)} → {formatTimeOffDate(req.endDate)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {req.days} {unitLabel}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={req.status.toLowerCase() as "pending" | "approved" | "refused" | "cancelled"} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/time-off/requests/${req.id}`} className="text-xs font-medium text-primary hover:underline">
                      View
                    </Link>
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
