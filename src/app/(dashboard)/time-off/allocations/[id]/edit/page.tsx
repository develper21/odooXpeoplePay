"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useTimeOffAllocation,
  useUpdateAllocation,
  useEmployees,
  useTimeOffTypes,
} from "@/hooks/use-data";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { AllocationForm } from "@/components/time-off/allocation-form";
import type { TimeOffAllocation } from "@/types/domain";

export default function EditAllocationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: allocation, isLoading, isError } = useTimeOffAllocation(id);
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useTimeOffTypes();
  const mutation = useUpdateAllocation();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !allocation)
    return <ErrorState message="Allocation record was not found." />;

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title="Edit Leave Allocation"
        description="Update allocation quantity, status, or validity period."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <AllocationForm
            initialValues={allocation}
            employees={employees}
            types={types}
            submitting={mutation.isPending}
            submitLabel="Update Allocation"
            onCancel={() => router.push(`/time-off/allocations/${id}`)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({
                id,
                input: values as Partial<TimeOffAllocation>,
              });
              setToastMessage("Allocation updated successfully.");
              setTimeout(() => {
                router.push(`/time-off/allocations/${id}`);
              }, 600);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Allocation could not be updated.
        </p>
      )}
    </>
  );
}
