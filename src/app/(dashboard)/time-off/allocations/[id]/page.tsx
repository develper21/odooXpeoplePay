"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Trash2, XCircle } from "lucide-react";
import {
  useTimeOffAllocation,
  useDeleteAllocation,
  useEmployee,
  useTimeOff,
  useApproveAllocation,
  useRefuseAllocation,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { formatTimeOffDate } from "@/lib/time-off-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";
import { LeaveBalanceCard } from "@/components/time-off/leave-balance-card";

export default function AllocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: allocation, isLoading, isError } = useTimeOffAllocation(id);
  const { data: employee } = useEmployee(allocation?.employeeId ?? "");
  const { data: requests = [] } = useTimeOff();
  const deleteMutation = useDeleteAllocation();
  const approveMutation = useApproveAllocation();
  const refuseMutation = useRefuseAllocation();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRefuseOpen, setConfirmRefuseOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !allocation) return <ErrorState message="Allocation record was not found." />;

  // Employee role can only view their own allocation
  if (user?.role === "EMPLOYEE" && allocation.employeeId !== user.employeeId) {
    return <ErrorState message="You are not authorized to view this leave allocation." />;
  }

  const canEdit = Boolean(user && canAccess(user.role, "timeoff.approve"));
  const canDelete = Boolean(user && canAccess(user.role, "timeoff.delete"));

  const matchingRequests = requests.filter(
    (r) =>
      r.employeeId === allocation.employeeId &&
      (r.allocationId === allocation.id || r.type.toLowerCase() === allocation.type.toLowerCase())
  );

  const handleApprove = async () => {
    await approveMutation.mutateAsync(id);
    setToastMessage("Allocation approved! Balance is now available for leave requests.");
  };

  const handleRefuse = async () => {
    await refuseMutation.mutateAsync({ id });
    setToastMessage("Allocation refused. It will not contribute to employee balances.");
    setConfirmRefuseOpen(false);
  };

  const remove = async () => {
    await deleteMutation.mutateAsync(id);
    setToastMessage("Allocation deleted successfully.");
    setTimeout(() => {
      router.push("/time-off/allocations");
    }, 600);
  };

  const isPending = allocation.status === "PENDING";
  const isApproved = allocation.status === "APPROVED" || allocation.status === "ACTIVE";
  const isRefused = allocation.status === "REFUSED";

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title={`Allocation · ${allocation.type}`}
        description={`${employee ? employeeName(employee) : allocation.employeeId}`}
        action={
          canEdit
            ? { label: "Edit Allocation", href: `/time-off/allocations/${id}/edit` }
            : undefined
        }
      />

      {/* Action and status bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge
            status={
              allocation.status.toLowerCase() as
                | "active"
                | "expired"
                | "draft"
                | "inactive"
                | "pending"
                | "approved"
                | "refused"
            }
          />
          <span className="text-xs text-text-muted">
            {isApproved && "Available for leave consumption"}
            {isPending && "Awaiting HR Manager or Admin approval"}
            {isRefused && "Refused — unavailable for leave requests"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPending && canEdit && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                onClick={handleApprove}
                busy={approveMutation.isPending}
              >
                <CheckCircle2 className="size-4" /> Approve Allocation
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmRefuseOpen(true)}
              >
                <XCircle className="size-4" /> Refuse Allocation
              </Button>
            </>
          )}

          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="size-4 text-text-muted hover:text-red-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle informational banners */}
      {isPending && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
          <Clock className="size-5 shrink-0 text-amber-400" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-amber-200">Allocation Pending Approval</p>
            <p className="mt-0.5 text-amber-300/90">
              This quota of {allocation.allocatedDays} {allocation.unit ?? "DAYS"} has been submitted
              for approval. Per enterprise policy, it does <strong>not</strong> contribute to the
              employee’s usable leave balance until an authorized manager approves it.
            </p>
          </div>
        </div>
      )}

      {isRefused && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          <AlertCircle className="size-5 shrink-0 text-red-400" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-red-200">Allocation Refused</p>
            <p className="mt-0.5 text-red-300/90">
              This allocation was refused and has not contributed to the employee’s leave balance.
              If this was done in error, please submit a new allocation request.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-300">
          <CheckCircle2 className="size-5 shrink-0 text-green-400" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-green-200">Allocation Approved & Active</p>
            <p className="mt-0.5 text-green-300/90">
              This allocation is active. Employees may submit leave requests against the {allocation.remainingDays}{" "}
              {allocation.unit ?? "DAYS"} remaining balance within the validity window.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <LeaveBalanceCard allocation={allocation} />

        <Card>
          <CardHeader>
            <CardTitle>Allocation Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Employee</p>
              <Link
                href={`/employees/${allocation.employeeId}`}
                className="mt-1 block text-sm font-semibold text-primary"
              >
                {employee ? employeeName(employee) : allocation.employeeId}
              </Link>
            </div>
            <div>
              <p className="text-xs text-text-muted">Time Off Type</p>
              <p className="mt-1 text-sm font-semibold">{allocation.type}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Allocated Quantity</p>
              <p className="mt-1 text-lg font-bold">
                {allocation.allocatedDays}{" "}
                <span className="text-xs font-normal text-text-muted">
                  {allocation.unit ?? "DAYS"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Taken Quantity</p>
              <p className="mt-1 text-lg font-bold text-text-secondary">
                {allocation.usedDays}{" "}
                <span className="text-xs font-normal text-text-muted">
                  {allocation.unit ?? "DAYS"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Validity Period</p>
              <p className="mt-1 text-sm font-medium">
                {formatTimeOffDate(allocation.validFrom)} → {formatTimeOffDate(allocation.validTo)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Related Requests</p>
              <p className="mt-1 text-sm font-medium">{matchingRequests.length} submitted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        open={confirmDeleteOpen}
        title="Delete allocation?"
        message="This action removes the allocation record. Any leave balance calculations will update accordingly."
        confirmLabel="Delete Allocation"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={remove}
        busy={deleteMutation.isPending}
      />

      {/* Refusal confirmation dialog */}
      <ConfirmationDialog
        open={confirmRefuseOpen}
        title="Refuse Leave Allocation?"
        message="Refusing this allocation will permanently mark it as REFUSED and prevent it from becoming available to the employee."
        confirmLabel="Refuse Allocation"
        onCancel={() => setConfirmRefuseOpen(false)}
        onConfirm={handleRefuse}
        busy={refuseMutation.isPending}
      />
    </>
  );
}
