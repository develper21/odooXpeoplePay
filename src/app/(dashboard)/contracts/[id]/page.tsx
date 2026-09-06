"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useContract,
  useDeleteContract,
  useEmployee,
  useSalaryStructures,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { formatDate, employeeName } from "@/lib/hr-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: contract, isLoading, isError } = useContract(id);
  const { data: employee } = useEmployee(contract?.employeeId ?? "");
  const { data: structures = [] } = useSalaryStructures();
  const deleteContract = useDeleteContract();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (isLoading) return <LoadingState />;
  if (isError || !contract)
    return <ErrorState message="Contract record was not found." />;
  const canEdit = Boolean(user && canAccess(user.role, "contract.update"));
  const canDelete = Boolean(user && canAccess(user.role, "contract.delete"));
  const remove = async () => {
    await deleteContract.mutateAsync(id);
    router.push(`/employees/${contract.employeeId}/contracts`);
  };
  return (
    <>
      <PageHeader
        title={contract.reference}
        description={contract.title}
        action={
          canEdit
            ? { label: "Edit Contract", href: `/contracts/${id}/edit` }
            : undefined
        }
      />
      <div className="mb-6 flex items-center gap-3">
        <StatusBadge
          status={
            contract.status.toLowerCase() as
              | "active"
              | "expired"
              | "draft"
              | "terminated"
          }
        />
        {canDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Contract details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Employee</p>
              <Link
                href={`/employees/${contract.employeeId}`}
                className="mt-1 block text-sm font-semibold text-primary"
              >
                {employeeName(employee)}
              </Link>
            </div>
            <div>
              <p className="text-xs text-text-muted">Contract ID</p>
              <p className="mt-1 text-sm font-medium">{contract.reference}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Start date</p>
              <p className="mt-1 text-sm font-medium">
                {formatDate(contract.startDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">End date</p>
              <p className="mt-1 text-sm font-medium">
                {formatDate(contract.endDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Department</p>
              <p className="mt-1 text-sm font-medium">{contract.department}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Position</p>
              <p className="mt-1 text-sm font-medium">{contract.position}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Monthly wage</p>
              <p className="mt-1 text-xl font-bold">
                ${contract.monthlySalary.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Salary structure</p>
              <p className="mt-1 text-sm font-medium">
                {structures.find(
                  (structure) => structure.id === contract.salaryStructureId,
                )?.name ?? "Not assigned"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payroll period context</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-text-secondary">
              This contract remains linked to {employeeName(employee)} and
              preserves its validity dates for future period-based payroll
              selection.
            </p>
            {contract.status === "ACTIVE" && (
              <div className="mt-5 rounded-md border border-success/30 bg-success/5 p-4 text-sm text-success">
                Active contract for the current workforce record.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmationDialog
        open={confirmOpen}
        title="Delete contract?"
        message="This removes the mock contract record from the employee history. Historical payroll references may need review."
        confirmLabel="Delete contract"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
        busy={deleteContract.isPending}
      />
    </>
  );
}
