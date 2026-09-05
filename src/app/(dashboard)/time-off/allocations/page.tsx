"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useTimeOffAllocations, useEmployees, useTimeOffTypes } from "@/hooks/use-data";
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

export default function AllocationsPage() {
  const { data: allocations = [], isLoading, isError } = useTimeOffAllocations();
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useTimeOffTypes();
  const { user } = useAuth();
  const isEmployeeRole = user?.role === "EMPLOYEE";
  const currentUserEmpId = user?.employeeId ?? "emp-001";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const scopedAllocations = useMemo(() => {
    return isEmployeeRole
      ? allocations.filter((a) => a.employeeId === currentUserEmpId)
      : allocations;
  }, [allocations, isEmployeeRole, currentUserEmpId]);

  const filtered = useMemo(() => {
    return scopedAllocations.filter((alloc) => {
      const emp = employees.find((e) => e.id === alloc.employeeId);
      const name = emp ? employeeName(emp).toLowerCase() : "";
      const code = emp ? emp.employeeNumber.toLowerCase() : "";
      const matchSearch =
        name.includes(search.toLowerCase()) ||
        code.includes(search.toLowerCase()) ||
        alloc.type.toLowerCase().includes(search.toLowerCase());

      const matchType =
        typeFilter === "ALL" ||
        alloc.typeId === typeFilter ||
        alloc.type.toLowerCase() === typeFilter.toLowerCase();

      const matchStatus = statusFilter === "ALL" || alloc.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [scopedAllocations, employees, search, typeFilter, statusFilter]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Leave allocations could not be loaded." />;

  const canManage = Boolean(user && canAccess(user.role, "timeoff.approve"));

  return (
    <>
      <PageHeader
        title="Leave Allocations"
        description="Manage employee leave quotas, taken balance, and validity periods."
        action={
          canManage
            ? { label: "New Allocation", href: "/time-off/allocations/new" }
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
              placeholder="Search by employee or leave type..."
              className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="EXPIRED">Expired</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="h-10 rounded-md px-3 text-xs text-text-secondary hover:bg-surface-raised"
          >
            Reset
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No allocations found" message="Try a different search or create a new leave allocation." />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Allocated</TableCell>
              <TableCell>Taken</TableCell>
              <TableCell>Remaining</TableCell>
              <TableCell>Validity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filtered.map((alloc) => {
              const emp = employees.find((e) => e.id === alloc.employeeId);
              const unitLabel = alloc.unit === "HOURS" ? "hrs" : "days";
              return (
                <TableRow key={alloc.id}>
                  <TableCell>
                    <Link href={`/employees/${alloc.employeeId}`} className="font-semibold hover:text-primary">
                      {emp ? employeeName(emp) : alloc.employeeId}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">{alloc.type}</TableCell>
                  <TableCell className="font-semibold">
                    {alloc.allocatedDays} {unitLabel}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {alloc.usedDays} {unitLabel}
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {alloc.remainingDays} {unitLabel}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {formatTimeOffDate(alloc.validFrom)} → {formatTimeOffDate(alloc.validTo)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={alloc.status.toLowerCase() as "active" | "expired" | "draft" | "inactive"} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/time-off/allocations/${alloc.id}`} className="text-xs font-medium text-primary hover:underline">
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
