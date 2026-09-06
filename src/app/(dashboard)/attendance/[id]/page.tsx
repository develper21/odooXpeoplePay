"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useAttendanceRecord,
  useDeleteAttendance,
  useEmployee,
  useSchedules,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { formatDuration, calculateWorkedMinutes } from "@/lib/time-utils";
import { scheduleDayForDate } from "@/lib/attendance-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function AttendanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: record, isLoading, isError } = useAttendanceRecord(id);
  const { data: employee } = useEmployee(record?.employeeId ?? "");
  const { data: schedules = [] } = useSchedules();
  const remove = useDeleteAttendance();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (isLoading) return <LoadingState />;
  if (isError || !record)
    return <ErrorState message="Attendance record was not found." />;
  const schedule = schedules.find((item) => item.id === employee?.scheduleId);
  const scheduleDay = scheduleDayForDate(record.date, schedule);
  const worked =
    record.workedMinutes ??
    calculateWorkedMinutes(
      record.checkIn,
      record.checkOut,
      record.breakMinutes,
    );
  const canEdit = Boolean(user && canAccess(user.role, "attendance.update"));
  const canDelete = Boolean(user && canAccess(user.role, "attendance.delete"));
  return (
    <>
      <PageHeader
        title="Attendance record"
        description={`${employeeName(employee)} · ${record.date}`}
        action={
          canEdit
            ? { label: "Correct record", href: `/attendance/${id}/edit` }
            : undefined
        }
      />
      <div className="mb-6 flex items-center gap-3">
        <StatusBadge
          status={
            record.status.toLowerCase() as
              | "present"
              | "late"
              | "absent"
              | "overtime"
              | "missing_checkout"
              | "manual_edit"
          }
        />
        {record.manuallyEdited && (
          <span className="text-xs text-primary">Manual edit</span>
        )}
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
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Attendance details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-muted">Employee</p>
              <Link
                href={`/employees/${record.employeeId}`}
                className="mt-1 block text-sm font-semibold text-primary"
              >
                {employeeName(employee)}
              </Link>
            </div>
            <div>
              <p className="text-xs text-text-muted">Date</p>
              <p className="mt-1 text-sm font-medium">{record.date}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Check in</p>
              <p className="mt-1 text-xl font-bold">{record.checkIn || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Check out</p>
              <p className="mt-1 text-xl font-bold">{record.checkOut || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Worked hours</p>
              <p className="mt-1 text-xl font-bold text-primary">
                {formatDuration(worked)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Notes</p>
              <p className="mt-1 text-sm text-text-secondary">
                {record.notes || "No notes"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Schedule context</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">
              {schedule?.name ?? "No schedule assigned"}
            </p>
            {scheduleDay?.enabled ? (
              <p className="mt-2 text-sm text-text-secondary">
                Expected {scheduleDay.startTime} → {scheduleDay.endTime}, break{" "}
                {scheduleDay.breakMinutes}m
              </p>
            ) : (
              <p className="mt-2 text-sm text-text-muted">
                No working schedule for this date.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmationDialog
        open={confirmOpen}
        title="Delete attendance record?"
        message="This removes the mock attendance record and updates employee attendance counts."
        confirmLabel="Delete record"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await remove.mutateAsync(id);
          router.push("/attendance");
        }}
        busy={remove.isPending}
      />
    </>
  );
}
