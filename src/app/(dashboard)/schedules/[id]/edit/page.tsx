"use client";

import { useParams, useRouter } from "next/navigation";
import { useSchedule, useUpdateSchedule } from "@/hooks/use-data";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ScheduleForm } from "@/components/schedules/schedule-form";
import type { WorkingSchedule } from "@/types/domain";

export default function EditSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: schedule, isLoading, isError } = useSchedule(id);
  const mutation = useUpdateSchedule();
  if (isLoading) return <LoadingState />;
  if (isError || !schedule)
    return <ErrorState message="Schedule record was not found." />;
  return (
    <>
      <PageHeader
        title="Edit Working Schedule"
        description="Update the expected weekly pattern."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <ScheduleForm
            initialValues={schedule}
            submitting={mutation.isPending}
            submitLabel="Update Schedule"
            onCancel={() => router.push(`/schedules/${id}`)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({
                id,
                input: values as Partial<WorkingSchedule>,
              });
              router.push(`/schedules/${id}`);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Schedule could not be updated.
        </p>
      )}
    </>
  );
}
