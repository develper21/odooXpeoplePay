"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTimeOffAllocations, useEmployee } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { formatTimeOffDate } from "@/lib/time-off-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/states";
import { DataTable, TableCell, TableHeader, TableRow } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveBalanceCard } from "@/components/time-off/leave-balance-card";

export default function EmployeeAllocationsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: employee, isLoading: empLoading } = useEmployee(id);
  const { data: allocations = [], isLoading: allocLoading, isError } = useTimeOffAllocations(id);

  if (empLoading || allocLoading) return <LoadingState />;
  if (!employee || isError || (user?.role === "EMPLOYEE" && user.employeeId !== id)) {
    return <ErrorState message="Leave allocations could not be loaded." />;
  }

  const canManage = Boolean(user && canAccess(user.role, "timeoff.approve"));

  return (
    <>
      <PageHeader
        title={`${employeeName(employee)} · Allocations`}
        description="Assigned leave quotas, taken balance, and validity periods."
        action={
          canManage
            ? { label: "New Allocation", href: `/time-off/allocations/new?employeeId=${id}` }
            : undefined
        }
      />

      {/* Leave Balances Section */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          Active Leave Balances
        </h2>
        {allocations.length === 0 ? (
          <EmptyState title="No leave allocations" message="This employee has not been assigned any leave quotas." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allocations.map((alloc) => (
              <LeaveBalanceCard key={alloc.id} allocation={alloc} />
            ))}
          </div>
        )}
      </section>

      {/* Allocations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Allocations ({allocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <EmptyState title="No allocations found" message="Create an allocation to grant leave balance to this employee." />
          ) : (
            <DataTable>
              <TableHeader>
                <TableRow>
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
                {allocations.map((alloc) => {
                  const unitLabel = alloc.unit === "HOURS" ? "hrs" : "days";
                  return (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-semibold text-text-primary">{alloc.type}</TableCell>
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
        </CardContent>
      </Card>
    </>
  );
}
