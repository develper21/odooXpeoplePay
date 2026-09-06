"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeleteSchedule, useEmployees, useSchedule } from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import {
  calculateDuration,
  calculateWeeklyMinutes,
  formatDuration,
} from "@/lib/time-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: schedule, isLoading, isError } = useSchedule(id);
  const { data: employees = [] } = useEmployees();
  const remove = useDeleteSchedule();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (isLoading) return <LoadingState />;
  if (isError || !schedule)
    return <ErrorState message="Schedule record was not found." />;
  const assigned = employees.filter((employee) => employee.scheduleId === id);
  const canEdit = Boolean(user && canAccess(user.role, "schedule.update"));
  const canDelete = Boolean(user && canAccess(user.role, "schedule.delete"));
  return (
    <>
      <PageHeader
        title={schedule.name}
        description={`${(schedule.type || "Fixed").replace(/_/g, " ")} · ${schedule.timezone || "UTC"}`}
        action={
          canEdit
            ? { label: "Edit Schedule", href: `/schedules/${id}/edit` }
            : undefined
        }
      />
      <div className="mb-6 flex items-center gap-3">
        <StatusBadge status={schedule.status} />
        <span className="text-sm font-semibold text-primary">
          {formatDuration(calculateWeeklyMinutes(schedule.days))}
        </span>
        {canDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            Delete
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Weekly pattern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {schedule.days.map((day) => (
            <div
              key={day.day}
              className="grid gap-2 rounded-md border bg-surface-raised p-4 sm:grid-cols-[130px_100px_1fr_100px] sm:items-center"
            >
              <span className="font-semibold">{day.day}</span>
              {day.enabled ? (
                <>
                  <span className="text-xs text-success">Working</span>
                  <span className="text-sm text-text-secondary">
                    {day.startTime} → {day.endTime} · Break {day.breakMinutes}m
                  </span>
                  <span className="text-sm font-semibold sm:text-right">
                    {formatDuration(
                      calculateDuration(
                        day.startTime,
                        day.endTime,
                        day.breakMinutes,
                      ),
                    )}
                  </span>
                </>
              ) : (
                <span className="text-xs text-text-muted sm:col-span-3">
                  Off
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Assigned employees</CardTitle>
          <span className="text-sm font-bold text-primary">
            {assigned.length}
          </span>
        </CardHeader>
        <CardContent>
          {assigned.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {assigned.map((employee) => (
                <Link
                  key={employee.id}
                  href={`/employees/${employee.id}`}
                  className="rounded-md border bg-surface-raised p-3 text-sm hover:border-primary/50"
                >
                  {employee.firstName} {employee.lastName}
                  <span className="mt-1 block text-xs text-text-muted">
                    {employee.employeeNumber} · {employee.position}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              No employees are assigned to this schedule.
            </p>
          )}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={confirmOpen}
        title="Delete schedule?"
        message="This removes the mock schedule definition. Employees will retain their reference until reassigned."
        confirmLabel="Delete schedule"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await remove.mutateAsync(id);
          router.push("/schedules");
        }}
        busy={remove.isPending}
      />
    </>
  );
}
