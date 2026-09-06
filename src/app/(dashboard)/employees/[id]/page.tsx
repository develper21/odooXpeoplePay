"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Pencil,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useEmployee,
  useEmployeeContracts,
  useEmployees,
  useAttendance,
  useTimeOff,
  useTimeOffAllocations,
  useSchedules,
  useDeleteEmployee,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName, formatDate, getActiveContract } from "@/lib/hr-utils";
import { PageHeader } from "@/components/shared/page-header";
import { SmartButton } from "@/components/shared/smart-button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { user } = useAuth();
  const { data: employee, isLoading, isError } = useEmployee(id);
  const { data: contracts = [] } = useEmployeeContracts(id);
  const { data: employees = [] } = useEmployees();
  const { data: attendance = [] } = useAttendance();
  const { data: timeOff = [] } = useTimeOff();
  const { data: allocations = [] } = useTimeOffAllocations();
  const { data: schedules = [] } = useSchedules();
  const deleteEmployee = useDeleteEmployee();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (isLoading) return <LoadingState />;
  if (isError || !employee)
    return <ErrorState message="Employee record was not found." />;
  const manager = employees.find(
    (candidate) => candidate.id === employee.managerId,
  );
  const schedule = schedules.find(
    (candidate) => candidate.id === employee.scheduleId,
  );
  const activeContract = getActiveContract(contracts);
  const canEdit = Boolean(user && canAccess(user.role, "employee.update"));
  const canDelete = Boolean(user && canAccess(user.role, "employee.delete"));
  const remove = async () => {
    await deleteEmployee.mutateAsync(id);
    router.push("/employees");
  };
  return (
    <>
      <PageHeader
        title={employeeName(employee)}
        description={`${employee.employeeNumber} · ${employee.position}`}
        action={
          canEdit
            ? { label: "Edit Employee", href: `/employees/${id}/edit` }
            : undefined
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge
          status={
            employee.status.toLowerCase() as "active" | "inactive" | "on_leave"
          }
        />
        <span className="text-xs text-text-muted">
          Joined {formatDate(employee.joinedOn)}
        </span>
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
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>Employee information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="text-xs text-text-muted">Department</p>
              <p className="mt-1 text-sm font-medium">{employee.department}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Job position</p>
              <p className="mt-1 text-sm font-medium">{employee.position}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Manager</p>
              <p className="mt-1 text-sm font-medium">
                {manager ? employeeName(manager) : "No manager"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Working schedule</p>
              <p className="mt-1 text-sm font-medium">
                {schedule ? (
                  <Link
                    href={`/schedules/${schedule.id}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    {schedule.name}
                  </Link>
                ) : (
                  "Not assigned"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Employee type</p>
              <p className="mt-1 text-sm font-medium">
                {(employee.employeeType || "Full Time").replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Email</p>
              <p className="mt-1 text-sm font-medium">{employee.email}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current contract</CardTitle>
          </CardHeader>
          <CardContent>
            {activeContract ? (
              <div className="rounded-md border border-success/30 bg-success/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{activeContract.reference}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {activeContract.position} · {activeContract.department}
                    </p>
                  </div>
                  <StatusBadge status="active" />
                </div>
                <p className="mt-4 text-xl font-bold">
                  ${activeContract.monthlySalary.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-text-muted">
                    monthly
                  </span>
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Since {formatDate(activeContract.startDate)} ·{" "}
                  {activeContract.title}
                </p>
              </div>
            ) : (
              <EmptyState
                title="No active contract"
                message="This employee does not currently have an active contract."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <SmartButton
          href={`/employees/${id}/contracts`}
          icon={FileText}
          label="Contracts"
          count={contracts.length}
        />
        <SmartButton
          href={`/employees/${id}/attendance?employee=${id}`}
          icon={ClipboardList}
          label="Attendance"
          count={attendance.filter((record) => record.employeeId === id).length}
        />
        <SmartButton
          href={`/employees/${id}/time-off`}
          icon={CalendarDays}
          label="Time Off"
          count={timeOff.filter((request) => request.employeeId === id).length}
        />
        <SmartButton
          href={`/employees/${id}/allocations?employee=${id}`}
          icon={WalletCards}
          label="Allocations"
          count={
            allocations.filter((allocation) => allocation.employeeId === id)
              .length
          }
        />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Contract history</CardTitle>
          <Link
            href={`/employees/${id}/contracts`}
            className="text-xs text-primary"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              title="No contracts found"
              message="Create a contract to connect this employee to payroll periods."
            />
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/contracts/${contract.id}`}
                  className="flex items-center justify-between rounded-md border bg-surface-raised p-4 hover:border-primary/50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {contract.reference} · {contract.title}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {formatDate(contract.startDate)} →{" "}
                      {formatDate(contract.endDate)} · $
                      {contract.monthlySalary.toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      contract.status.toLowerCase() as
                        | "active"
                        | "expired"
                        | "draft"
                        | "terminated"
                    }
                  />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={confirmOpen}
        title="Delete employee?"
        message="This removes the mock employee record. Related contracts and historical records may need review."
        confirmLabel="Delete employee"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
        busy={deleteEmployee.isPending}
      />
    </>
  );
}
