"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { useTimeOffAllocations, useEmployees, useTimeOffTypes, useApproveAllocation, useRefuseAllocation } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { formatTimeOffDate, usableAllocationRemaining } from "@/lib/time-off-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { DataTable, TableCell, TableHeader, TableRow } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";
import { TimeOffTabs } from "@/components/time-off/time-off-tabs";

export default function AllocationsPage() {
  const { data: allocations = [], isLoading, isError } = useTimeOffAllocations();
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useTimeOffTypes();
  const { user } = useAuth();
  const isEmployeeRole = user?.role === "EMPLOYEE";
  const currentUserEmpId = user?.employeeId ?? "emp-001";

  const approveMutation = useApproveAllocation();
  const refuseMutation = useRefuseAllocation();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refuseTargetId, setRefuseTargetId] = useState<string | null>(null);
  const [refuseReason, setRefuseReason] = useState("");

  const scopedAllocations = useMemo(() => {
    return isEmployeeRole
      ? allocations.filter((a) => a.employeeId === currentUserEmpId)
      : allocations;
  }, [allocations, isEmployeeRole, currentUserEmpId]);

  const pendingCount = useMemo(() => {
    return scopedAllocations.filter((a) => a.status === "PENDING").length;
  }, [scopedAllocations]);

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

  const handleApprove = async (id: string) => {
    await approveMutation.mutateAsync(id);
    setToastMessage("Leave allocation approved. Usable balance is now unlocked.");
  };

  const confirmRefuse = async () => {
    if (!refuseTargetId) return;
    await refuseMutation.mutateAsync({ id: refuseTargetId, reason: refuseReason });
    setToastMessage("Leave allocation refused.");
    setRefuseTargetId(null);
    setRefuseReason("");
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}

      <PageHeader
        title="Leave Allocations"
        description="Manage employee leave quotas, approval workflows, and validity periods."
        action={
          canManage
            ? { label: "New Allocation", href: "/time-off/allocations/new" }
            : undefined
        }
      />

      <TimeOffTabs />

      {/* Quick summary strip for managers */}
      {canManage && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "ALL"
                ? "bg-primary text-white"
                : "border bg-surface text-text-secondary hover:bg-surface-raised"
            }`}
          >
            All Allocations ({scopedAllocations.length})
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "PENDING"
                ? "bg-amber-500 text-white"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <Clock className="size-3.5" />
            Pending Approval ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "APPROVED"
                ? "bg-green-600 text-white"
                : "border bg-surface text-text-secondary hover:bg-surface-raised"
            }`}
          >
            Approved ({scopedAllocations.filter((a) => a.status === "APPROVED" || a.status === "ACTIVE").length})
          </button>
          <button
            onClick={() => setStatusFilter("REFUSED")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "REFUSED"
                ? "bg-red-600 text-white"
                : "border bg-surface text-text-secondary hover:bg-surface-raised"
            }`}
          >
            Refused ({scopedAllocations.filter((a) => a.status === "REFUSED").length})
          </button>
        </div>
      )}

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
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ACTIVE">Active</option>
            <option value="REFUSED">Refused</option>
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
        <EmptyState
          title="No allocations found"
          message="Try a different search or create a new leave allocation."
        />
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
              const isPending = alloc.status === "PENDING";

              return (
                <TableRow key={alloc.id}>
                  <TableCell>
                    <Link
                      href={`/employees/${alloc.employeeId}`}
                      className="font-semibold hover:text-primary"
                    >
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
                    {usableAllocationRemaining(alloc)} {unitLabel}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {formatTimeOffDate(alloc.validFrom)} → {formatTimeOffDate(alloc.validTo)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        alloc.status.toLowerCase() as
                          | "active"
                          | "expired"
                          | "draft"
                          | "inactive"
                          | "pending"
                          | "approved"
                          | "refused"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isPending && canManage && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 border-green-500/30 bg-green-500/10 px-2 text-[11px] font-semibold text-green-400 hover:bg-green-500/20"
                            onClick={() => handleApprove(alloc.id)}
                            busy={approveMutation.isPending}
                          >
                            <CheckCircle2 className="mr-1 size-3" /> Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-semibold"
                            onClick={() => setRefuseTargetId(alloc.id)}
                          >
                            <XCircle className="mr-1 size-3" /> Refuse
                          </Button>
                        </>
                      )}
                      <Link
                        href={`/time-off/allocations/${alloc.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {/* Refusal Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(refuseTargetId)}
        title="Refuse Leave Allocation?"
        message="Refusing this allocation will permanently prevent it from contributing to the employee's usable leave balance. This action cannot be reversed."
        confirmLabel="Refuse Allocation"
        onCancel={() => {
          setRefuseTargetId(null);
          setRefuseReason("");
        }}
        onConfirm={confirmRefuse}
        busy={refuseMutation.isPending}
      />
    </>
  );
}
