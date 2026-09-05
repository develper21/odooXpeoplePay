"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { useTimeOffRequest, useDeleteTimeOffRequest, useEmployee, useTimeOffAllocations, useTimeOffTypes, useApproveTimeOff, useRefuseTimeOff } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { findApplicableAllocation, canApproveTimeOffRequest, formatTimeOffDate } from "@/lib/time-off-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: request, isLoading, isError } = useTimeOffRequest(id);
  const { data: employee } = useEmployee(request?.employeeId ?? "");
  const { data: allocations = [] } = useTimeOffAllocations();
  const { data: types = [] } = useTimeOffTypes();

  const approveMutation = useApproveTimeOff();
  const refuseMutation = useRefuseTimeOff();
  const deleteMutation = useDeleteTimeOffRequest();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refuseConfirmOpen, setRefuseConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !request) return <ErrorState message="Time Off request was not found." />;

  // Employee role can only view their own requests
  if (user?.role === "EMPLOYEE" && request.employeeId !== user.employeeId) {
    return <ErrorState message="You are not authorized to view this leave request." />;
  }

  const canApproveRefuse = Boolean(user && canAccess(user.role, "timeoff.approve"));
  const canEdit = Boolean(
    user &&
    canAccess(user.role, "timeoff.create") &&
    request.status === "PENDING" &&
    (user.role !== "EMPLOYEE" || request.employeeId === user.employeeId)
  );
  const canDelete = Boolean(user && canAccess(user.role, "timeoff.delete"));

  const matchedType = types.find(
    (t) => t.id === request.typeId || t.name.toLowerCase() === request.type.toLowerCase()
  );

  const matchedAllocation = findApplicableAllocation(
    allocations,
    request.employeeId,
    request.typeId ?? request.type,
    request.startDate
  );

  const approvalCheck = canApproveTimeOffRequest(request, matchedAllocation, matchedType);

  const handleApprove = async () => {
    await approveMutation.mutateAsync(id);
    setToastMessage("Request approved successfully.");
  };

  const handleRefuse = async () => {
    await refuseMutation.mutateAsync(id);
    setRefuseConfirmOpen(false);
    setToastMessage("Request refused successfully.");
  };

  const remove = async () => {
    await deleteMutation.mutateAsync(id);
    setToastMessage("Request deleted successfully.");
    setTimeout(() => {
      router.push("/time-off/requests");
    }, 600);
  };

  const unitLabel = request.unit === "HOURS" ? "hours" : "days";

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title={`Request · ${request.type}`}
        description={`${employee ? employeeName(employee) : request.employeeId} · ${formatTimeOffDate(request.startDate)} → ${formatTimeOffDate(request.endDate)}`}
        action={
          canEdit
            ? { label: "Edit Request", href: `/time-off/requests/${id}/edit` }
            : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={request.status.toLowerCase() as "pending" | "approved" | "refused"} />
          {canDelete && (
            <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
        </div>

        {/* Approval Actions Bar */}
        {canApproveRefuse && request.status === "PENDING" && (
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="danger"
              disabled={refuseMutation.isPending}
              onClick={() => setRefuseConfirmOpen(true)}
            >
              <XCircle className="size-4" /> Refuse Request
            </Button>

            <Button
              size="sm"
              className="bg-success text-white hover:bg-success/90"
              disabled={approveMutation.isPending || !approvalCheck.canApprove}
              onClick={handleApprove}
            >
              <CheckCircle2 className="size-4" /> Approve Request
            </Button>
          </div>
        )}
      </div>

      {!approvalCheck.canApprove && request.status === "PENDING" && (
        <div className="mb-6 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-400">
          ⚠️ {approvalCheck.reason}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Employee</p>
              <Link href={`/employees/${request.employeeId}`} className="mt-1 block text-sm font-semibold text-primary">
                {employee ? employeeName(employee) : request.employeeId}
              </Link>
            </div>
            <div>
              <p className="text-xs text-text-muted">Leave Type</p>
              <p className="mt-1 text-sm font-semibold">{request.type}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Start Date</p>
              <p className="mt-1 text-sm font-medium">{formatTimeOffDate(request.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">End Date</p>
              <p className="mt-1 text-sm font-medium">{formatTimeOffDate(request.endDate)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Requested Duration</p>
              <p className="mt-1 text-xl font-bold text-primary">
                {request.days} <span className="text-xs font-normal text-text-muted">{unitLabel}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Status</p>
              <p className="mt-1 text-sm font-medium">{request.status}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-text-muted">Reason / Description</p>
              <p className="mt-1 rounded-md border bg-surface-raised p-3 text-sm text-text-secondary">
                {request.reason || "No reason provided."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocation & Balance Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {matchedAllocation ? (
              <div className="rounded-md border bg-surface-raised p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{matchedAllocation.type}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Allocation Ref: {matchedAllocation.id}
                    </p>
                  </div>
                  <StatusBadge status={matchedAllocation.status.toLowerCase() as "active" | "expired"} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center border-t border-border/40 pt-3">
                  <div>
                    <p className="text-xs text-text-muted">Current Remaining</p>
                    <p className="mt-1 text-lg font-bold text-primary">
                      {matchedAllocation.remainingDays} {unitLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted">Projected After Approval</p>
                    <p className="mt-1 text-lg font-bold text-success">
                      {request.status === "APPROVED"
                        ? matchedAllocation.remainingDays
                        : Math.max(0, matchedAllocation.remainingDays - request.days)}{" "}
                      {unitLabel}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
                No matched allocation record required or found for this request.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        title="Delete request?"
        message="This action removes the request record. If approved, allocation consumption will be reversed."
        confirmLabel="Delete Request"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
        busy={deleteMutation.isPending}
      />

      <ConfirmationDialog
        open={refuseConfirmOpen}
        title="Refuse leave request?"
        message="Are you sure you want to refuse this leave request? The employee's allocation will not be deducted."
        confirmLabel="Refuse Request"
        onCancel={() => setRefuseConfirmOpen(false)}
        onConfirm={handleRefuse}
        busy={refuseMutation.isPending}
      />
    </>
  );
}
