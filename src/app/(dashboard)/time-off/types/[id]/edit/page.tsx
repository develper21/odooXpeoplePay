"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useTimeOffType, useUpdateTimeOffType } from "@/hooks/use-data";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { TimeOffTypeForm } from "@/components/time-off/type-form";
import type { TimeOffType } from "@/types/domain";

export default function EditTimeOffTypePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: type, isLoading, isError } = useTimeOffType(id);
  const mutation = useUpdateTimeOffType();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !type)
    return <ErrorState message="Leave type was not found." />;

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title={`Edit ${type.name}`}
        description="Update policy settings, units, or availability."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <TimeOffTypeForm
            initialValues={type}
            submitting={mutation.isPending}
            submitLabel="Update Leave Type"
            onCancel={() => router.push(`/time-off/types/${id}`)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({
                id,
                input: values as Partial<TimeOffType>,
              });
              setToastMessage("Time Off Type updated successfully.");
              setTimeout(() => {
                router.push(`/time-off/types/${id}`);
              }, 600);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Leave type could not be updated.
        </p>
      )}
    </>
  );
}
