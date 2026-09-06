"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useAttendanceRecord,
  useEmployees,
  useSchedules,
  useUpdateAttendance,
} from "@/hooks/use-data";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import type { AttendanceRecord } from "@/types/domain";

export default function EditAttendancePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: record, isLoading, isError } = useAttendanceRecord(id);
  const { data: employees = [] } = useEmployees();
  const { data: schedules = [] } = useSchedules();
  const mutation = useUpdateAttendance();
  if (isLoading) return <LoadingState />;
  if (isError || !record)
    return <ErrorState message="Attendance record was not found." />;
  return (
    <>
      <PageHeader
        title="Correct Attendance"
        description="Update the existing record and recalculate worked hours."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <AttendanceForm
            initialValues={record}
            employees={employees}
            schedules={schedules}
            submitting={mutation.isPending}
            submitLabel="Save Correction"
            onCancel={() => router.push(`/attendance/${id}`)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({
                id,
                input: values as Partial<AttendanceRecord>,
              });
              router.push(`/attendance/${id}`);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Attendance correction could not be saved.
        </p>
      )}
    </>
  );
}
