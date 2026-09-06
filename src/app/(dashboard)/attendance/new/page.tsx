"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAttendance,
  useCreateAttendance,
  useEmployees,
  useSchedules,
} from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import type { AttendanceRecord } from "@/types/domain";

function NewAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const { data: employees = [] } = useEmployees();
  const { data: schedules = [] } = useSchedules();
  const { data: records = [] } = useAttendance();
  const mutation = useCreateAttendance();

  return (
    <>
      <PageHeader
        title="Add Attendance"
        description="Record actual employee presence or a manual correction."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <AttendanceForm
            initialValues={{ employeeId }}
            employees={employees}
            schedules={schedules}
            submitting={mutation.isPending}
            onCancel={() => router.back()}
            onSubmit={async (values) => {
              await mutation.mutateAsync(
                values as Omit<AttendanceRecord, "id">,
              );
              router.push(`/employees/${values.employeeId}/attendance`);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Attendance could not be created.
        </p>
      )}
      <p className="sr-only">Existing attendance records: {records.length}</p>
    </>
  );
}

export default function NewAttendancePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewAttendanceContent />
    </Suspense>
  );
}
