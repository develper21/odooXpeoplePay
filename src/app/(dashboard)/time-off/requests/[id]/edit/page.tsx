"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  useTimeOffRequest,
  useUpdateTimeOffRequest,
  useEmployees,
  useTimeOffTypes,
  useTimeOffAllocations,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { RequestForm } from "@/components/time-off/request-form";
import type { TimeOffRequest } from "@/types/domain";

export default function EditTimeOffRequestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isEmployeeRole = user?.role === "EMPLOYEE";

  const { data: request, isLoading, isError } = useTimeOffRequest(id);
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useTimeOffTypes();
  const { data: allocations = [] } = useTimeOffAllocations();

  const mutation = useUpdateTimeOffRequest();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !request)
    return <ErrorState message="Request record was not found." />;
  if (request.status !== "PENDING") {
    return <ErrorState message="Only pending leave requests can be edited." />;
  }
  if (isEmployeeRole && request.employeeId !== user?.employeeId) {
    return (
      <ErrorState message="You are only authorized to edit your own leave requests." />
    );
  }

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title="Edit Time Off Request"
        description="Update dates or reason for this pending request."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <RequestForm
            initialValues={request}
            employees={employees}
            types={types}
            allocations={allocations}
            currentEmployeeId={user?.employeeId ?? "emp-001"}
            isEmployeeOnlyRole={isEmployeeRole}
            submitting={mutation.isPending}
            submitLabel="Update Request"
            onCancel={() => router.push(`/time-off/requests/${id}`)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({
                id,
                input: values as Partial<TimeOffRequest>,
              });
              setToastMessage("Request updated successfully.");
              setTimeout(() => {
                router.push(`/time-off/requests/${id}`);
              }, 600);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Request could not be updated.
        </p>
      )}
    </>
  );
}
