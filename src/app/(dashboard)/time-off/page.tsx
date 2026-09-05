"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Layers, ShieldCheck, XCircle } from "lucide-react";
import { useTimeOff, useTimeOffAllocations, useTimeOffTypes, useEmployees, useApproveTimeOff, useRefuseTimeOff } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/states";
import { DataTable, TableCell, TableHeader, TableRow } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";
import { TimeOffTabs } from "@/components/time-off/time-off-tabs";
import { LeaveBalanceCard } from "@/components/time-off/leave-balance-card";
import { formatTimeOffDate } from "@/lib/time-off-utils";

export default function TimeOffOverviewPage() {
  const { user } = useAuth();
  const { data: requests = [], isLoading: reqLoading, isError: reqError } = useTimeOff();
  const { data: allocations = [], isLoading: allocLoading } = useTimeOffAllocations();
  const { data: types = [], isLoading: typesLoading } = useTimeOffTypes();
  const { data: employees = [] } = useEmployees();

  const approveMutation = useApproveTimeOff();
  const refuseMutation = useRefuseTimeOff();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refuseTargetId, setRefuseTargetId] = useState<string | null>(null);

  if (reqLoading || allocLoading || typesLoading) return <LoadingState />;
  if (reqError) return <ErrorState message="Time Off data could not be loaded." />;

  const isEmployeeRole = user?.role === "EMPLOYEE";
  const currentUserEmpId = user?.employeeId ?? "emp-001";
  const canManage = Boolean(user && canAccess(user.role, "timeoff.approve"));
  const canCreate = Boolean(user && canAccess(user.role, "timeoff.create"));

  // Filter user's allocations & requests if employee role
  const myAllocations = allocations.filter((a) => a.employeeId === currentUserEmpId);
  const myRequests = requests.filter((r) => r.employeeId === currentUserEmpId);

  // Admin/Manager quick stats
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const activeAllocationsCount = allocations.filter((a) => a.status === "ACTIVE").length;

  const handleApprove = async (id: string) => {
    await approveMutation.mutateAsync(id);
    setToastMessage("Leave request approved successfully.");
  };

  const handleRefuse = async (id: string) => {
    await refuseMutation.mutateAsync(id);
    setToastMessage("Leave request refused successfully.");
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}

      <PageHeader
        title="Time Off Management"
        description="Oversee leave balances, submit requests, and handle approval workflows."
        action={
          canCreate
            ? { label: "New Request", href: "/time-off/requests/new" }
            : undefined
        }
      />

      <TimeOffTabs />

      {/* Metric Summary Bar for HR/Admin */}
      {canManage && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Pending Requests</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">{pendingRequests.length}</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <Clock className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Active Allocations</p>
                <p className="mt-1 text-2xl font-bold text-primary">{activeAllocationsCount}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Layers className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Leave Types Configured</p>
                <p className="mt-1 text-2xl font-bold text-success">{types.length}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-2 text-success">
                <ShieldCheck className="size-5" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Leave Balances Section */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          {isEmployeeRole ? "My Leave Balances" : "Sample Leave Balances (Rahul emp-001)"}
        </h2>
        {myAllocations.length === 0 ? (
          <EmptyState
            title="No active leave allocations"
            message="No leave balances have been granted yet for this account."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myAllocations.map((alloc) => (
              <LeaveBalanceCard key={alloc.id} allocation={alloc} />
            ))}
          </div>
        )}
      </section>

      {/* Pending Requests Actions Section (For Managers) */}
      {canManage && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Approval ({pendingRequests.length})</CardTitle>
            <Link href="/time-off/requests" className="text-xs text-primary font-medium hover:underline">
              View all requests
            </Link>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <EmptyState title="All caught up!" message="There are currently no pending leave requests awaiting approval." />
            ) : (
              <DataTable>
                <TableHeader>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {pendingRequests.slice(0, 5).map((req) => {
                    const emp = employees.find((e) => e.id === req.employeeId);
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <Link href={`/employees/${req.employeeId}`} className="font-semibold hover:text-primary">
                            {emp ? employeeName(emp) : req.employeeId}
                          </Link>
                        </TableCell>
                        <TableCell>{req.type}</TableCell>
                        <TableCell className="text-xs text-text-secondary">
                          {formatTimeOffDate(req.startDate)} → {formatTimeOffDate(req.endDate)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {req.days} {req.unit === "HOURS" ? "hrs" : "days"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-text-muted">
                          {req.reason}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-success text-white hover:bg-success/90 h-7 text-xs px-2"
                              disabled={approveMutation.isPending}
                              onClick={() => handleApprove(req.id)}
                            >
                              <CheckCircle2 className="size-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-7 text-xs px-2"
                              disabled={refuseMutation.isPending}
                              onClick={() => setRefuseTargetId(req.id)}
                            >
                              <XCircle className="size-3.5" /> Refuse
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isEmployeeRole ? "My Recent Requests" : "Recent Time Off Requests"}</CardTitle>
          <Link href="/time-off/requests" className="text-xs text-primary font-medium hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {(isEmployeeRole ? myRequests : requests).length === 0 ? (
            <EmptyState title="No requests found" message="Submit a time off request to see it here." />
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
                {(isEmployeeRole ? myRequests : requests).slice(0, 6).map((req) => {
                  const emp = employees.find((e) => e.id === req.employeeId);
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Link href={`/employees/${req.employeeId}`} className="font-semibold hover:text-primary">
                          {emp ? employeeName(emp) : req.employeeId}
                        </Link>
                      </TableCell>
                      <TableCell>{req.type}</TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {formatTimeOffDate(req.startDate)} → {formatTimeOffDate(req.endDate)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {req.days} {req.unit === "HOURS" ? "hrs" : "days"}
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
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={Boolean(refuseTargetId)}
        title="Refuse leave request?"
        message="Are you sure you want to refuse this leave request? The employee's allocation balance will not be deducted."
        confirmLabel="Refuse Request"
        onCancel={() => setRefuseTargetId(null)}
        onConfirm={async () => {
          if (refuseTargetId) {
            await handleRefuse(refuseTargetId);
            setRefuseTargetId(null);
          }
        }}
        busy={refuseMutation.isPending}
      />
    </>
  );
}
