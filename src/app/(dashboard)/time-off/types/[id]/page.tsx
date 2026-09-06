"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  useTimeOffType,
  useDeleteTimeOffType,
  useTimeOffAllocations,
  useTimeOff,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";

export default function TimeOffTypeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: type, isLoading, isError } = useTimeOffType(id);
  const { data: allocations = [] } = useTimeOffAllocations();
  const { data: requests = [] } = useTimeOff();
  const deleteMutation = useDeleteTimeOffType();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !type)
    return <ErrorState message="Leave type was not found." />;

  const canEdit = Boolean(user && canAccess(user.role, "timeoff.approve"));
  const canDelete = Boolean(user && canAccess(user.role, "timeoff.delete"));

  const matchingAllocations = allocations.filter(
    (a) =>
      String(a.typeId) === String(id) ||
      (Boolean(a.type && type?.name) &&
        a.type.toLowerCase() === type.name.toLowerCase()),
  );
  const matchingRequests = requests.filter(
    (r) =>
      String(r.typeId) === String(id) ||
      (Boolean(r.type && type?.name) &&
        r.type.toLowerCase() === type.name.toLowerCase()),
  );

  const remove = async () => {
    await deleteMutation.mutateAsync(id);
    setToastMessage("Leave type deleted successfully.");
    setTimeout(() => {
      router.push("/time-off/types");
    }, 600);
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title={type.name}
        description={`Leave Policy Configuration · Unit: ${type.unit}`}
        action={
          canEdit
            ? { label: "Edit Leave Type", href: `/time-off/types/${id}/edit` }
            : undefined
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <StatusBadge
          status={type.status.toLowerCase() as "active" | "inactive"}
        />
        {canDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Policy details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Type Name</p>
              <p className="mt-1 text-sm font-semibold">{type.name}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Unit</p>
              <p className="mt-1 text-sm font-semibold">{type.unit}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Allocation Required</p>
              <p className="mt-1 text-sm font-medium">
                {type.allocationRequired ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Approval Required</p>
              <p className="mt-1 text-sm font-medium">
                {type.approvalRequired ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Payroll Integration</p>
              <p className="mt-1 text-sm font-medium">
                {type.payrollIntegration ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Status</p>
              <p className="mt-1 text-sm font-medium">{type.status}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-surface-raised p-4">
              <div>
                <p className="text-xs text-text-muted">Active Allocations</p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {matchingAllocations.length}
                </p>
              </div>
              <Link
                href="/time-off/allocations"
                className="text-xs text-primary font-medium hover:underline"
              >
                View Allocations
              </Link>
            </div>

            <div className="flex items-center justify-between rounded-md border bg-surface-raised p-4">
              <div>
                <p className="text-xs text-text-muted">
                  Total Requests Submitted
                </p>
                <p className="mt-1 text-2xl font-bold text-success">
                  {matchingRequests.length}
                </p>
              </div>
              <Link
                href="/time-off/requests"
                className="text-xs text-primary font-medium hover:underline"
              >
                View Requests
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        title="Delete leave type?"
        message="This action removes the leave type configuration. Historical requests using this type will remain intact."
        confirmLabel="Delete Leave Type"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
        busy={deleteMutation.isPending}
      />
    </>
  );
}
