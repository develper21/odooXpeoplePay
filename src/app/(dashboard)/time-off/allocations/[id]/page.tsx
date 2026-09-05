"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTimeOffAllocation, useDeleteAllocation, useEmployee, useTimeOff } from "@/hooks/use-data";
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

  const [confirmOpen, setConfirmOpen] = useState(false);
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

  const remove = async () => {
    await deleteMutation.mutateAsync(id);
    setToastMessage("Allocation deleted successfully.");
    setTimeout(() => {
      router.push("/time-off/allocations");
    }, 600);
  };

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

      <div className="mb-6 flex items-center gap-3">
        <StatusBadge status={allocation.status.toLowerCase() as "active" | "expired" | "draft" | "inactive"} />
        {canDelete && (
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeaveBalanceCard allocation={allocation} />

        <Card>
          <CardHeader>
            <CardTitle>Allocation Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Employee</p>
              <Link href={`/employees/${allocation.employeeId}`} className="mt-1 block text-sm font-semibold text-primary">
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
                {allocation.allocatedDays} <span className="text-xs font-normal text-text-muted">{allocation.unit ?? "DAYS"}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Taken Quantity</p>
              <p className="mt-1 text-lg font-bold text-text-secondary">
                {allocation.usedDays} <span className="text-xs font-normal text-text-muted">{allocation.unit ?? "DAYS"}</span>
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

      <ConfirmationDialog
        open={confirmOpen}
        title="Delete allocation?"
        message="This action removes the mock allocation record. Remaining balances for this employee will update accordingly."
        confirmLabel="Delete Allocation"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
        busy={deleteMutation.isPending}
      />
    </>
  );
}
