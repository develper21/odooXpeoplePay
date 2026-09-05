"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCreateTimeOffRequest, useEmployees, useTimeOffAllocations, useTimeOffTypes } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/states";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { RequestForm } from "@/components/time-off/request-form";
import type { TimeOffRequest } from "@/types/domain";

function NewRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramEmployeeId = searchParams.get("employeeId") ?? undefined;

  const { user } = useAuth();
  const isEmployeeRole = user?.role === "EMPLOYEE";
  const currentUserEmpId = user?.employeeId ?? "emp-001";

  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: types = [], isLoading: typesLoading } = useTimeOffTypes();
  const { data: allocations = [], isLoading: allocLoading } = useTimeOffAllocations();

  const mutation = useCreateTimeOffRequest();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (empLoading || typesLoading || allocLoading) return <LoadingState />;

  const targetEmployeeId = paramEmployeeId ?? (isEmployeeRole ? currentUserEmpId : undefined);

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title="Submit Time Off Request"
        description="Request leave for personal, medical, or holiday absences."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <RequestForm
            initialValues={{ employeeId: targetEmployeeId }}
            employees={employees}
            types={types}
            allocations={allocations}
            currentEmployeeId={currentUserEmpId}
            isEmployeeOnlyRole={isEmployeeRole}
            submitting={mutation.isPending}
            onCancel={() => router.back()}
            onSubmit={async (values) => {
              await mutation.mutateAsync(values as Omit<TimeOffRequest, "id">);
              setToastMessage("Request submitted successfully.");
              setTimeout(() => {
                router.push(
                  isEmployeeRole
                    ? `/employees/${values.employeeId}/time-off`
                    : "/time-off/requests"
                );
              }, 600);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Time Off request could not be submitted.
        </p>
      )}
    </>
  );
}

export default function NewTimeOffRequestPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewRequestContent />
    </Suspense>
  );
}
