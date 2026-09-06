"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  useCreateAllocation,
  useEmployees,
  useTimeOffTypes,
} from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { AllocationForm } from "@/components/time-off/allocation-form";
import type { TimeOffAllocation } from "@/types/domain";

function NewAllocationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramEmployeeId = searchParams.get("employeeId") ?? undefined;

  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: types = [], isLoading: typesLoading } = useTimeOffTypes();
  const mutation = useCreateAllocation();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (empLoading || typesLoading) return <LoadingState />;

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title="New Leave Allocation"
        description="Grant an employee leave balance quota for a specific leave policy."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <AllocationForm
            initialValues={
              paramEmployeeId ? { employeeId: paramEmployeeId } : undefined
            }
            employees={employees}
            types={types}
            submitting={mutation.isPending}
            onCancel={() => router.back()}
            onSubmit={async (values) => {
              await mutation.mutateAsync(
                values as Omit<TimeOffAllocation, "id">,
              );
              setToastMessage("Allocation created successfully.");
              setTimeout(() => {
                router.push(
                  paramEmployeeId
                    ? `/employees/${paramEmployeeId}/allocations`
                    : "/time-off/allocations",
                );
              }, 600);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Allocation could not be created.
        </p>
      )}
    </>
  );
}

export default function NewAllocationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewAllocationContent />
    </Suspense>
  );
}
