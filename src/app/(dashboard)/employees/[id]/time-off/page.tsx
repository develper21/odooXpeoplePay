"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useTimeOff,
  useTimeOffAllocations,
  useEmployee,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { formatTimeOffDate } from "@/lib/time-off-utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/shared/states";
import {
  DataTable,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveBalanceCard } from "@/components/time-off/leave-balance-card";

export default function EmployeeTimeOffPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: employee, isLoading: empLoading } = useEmployee(id);
  const {
    data: requests = [],
    isLoading: reqLoading,
    isError: reqError,
  } = useTimeOff(id);
  const { data: allocations = [], isLoading: allocLoading } =
    useTimeOffAllocations(id);

  if (empLoading || reqLoading || allocLoading) return <LoadingState />;
  if (
    !employee ||
    reqError ||
    (user?.role === "EMPLOYEE" && user.employeeId !== id)
  ) {
    return <ErrorState message="Time Off records could not be loaded." />;
  }

  const canCreate = Boolean(user && canAccess(user.role, "timeoff.create"));

  return (
    <>
      <PageHeader
        title={`${employeeName(employee)} · Time Off`}
        description="Leave balances and request history for this employee."
        action={
          canCreate
            ? {
                label: "New Request",
                href: `/time-off/requests/new?employeeId=${id}`,
              }
            : undefined
        }
      />

      {/* Leave Balances Section */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          Active Leave Balances
        </h2>
        {allocations.length === 0 ? (
          <EmptyState
            title="No leave allocations"
            message="This employee has not been assigned any leave quotas."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allocations.map((alloc) => (
              <LeaveBalanceCard key={alloc.id} allocation={alloc} />
            ))}
          </div>
        )}
      </section>

      {/* Request History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Request History ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <EmptyState
              title="No time off requests"
              message="This employee has not submitted any leave requests."
            />
          ) : (
            <DataTable>
              <TableHeader>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <tbody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-semibold text-text-primary">
                      {req.type}
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      {formatTimeOffDate(req.startDate)} →{" "}
                      {formatTimeOffDate(req.endDate)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {req.days} {req.unit === "HOURS" ? "hrs" : "days"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-text-muted">
                      {req.reason}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          req.status.toLowerCase() as
                            | "pending"
                            | "approved"
                            | "refused"
                            | "cancelled"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/time-off/requests/${req.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </>
  );
}
