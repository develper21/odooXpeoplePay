"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useEmployee,
  useEmployees,
  useSchedules,
  useUpdateEmployee,
} from "@/hooks/use-data";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeForm } from "@/components/employees/employee-form";

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: employee, isLoading, isError } = useEmployee(id);
  const { data: employees = [] } = useEmployees();
  const { data: schedules = [] } = useSchedules();
  const mutation = useUpdateEmployee();
  if (isLoading) return <LoadingState />;
  if (isError || !employee)
    return <ErrorState message="Employee record was not found." />;
  return (
    <>
      <PageHeader
        title="Edit Employee"
        description={`Update ${employee.firstName} ${employee.lastName}'s workforce information.`}
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <EmployeeForm
            initialValues={employee}
            managers={employees.filter((candidate) => candidate.id !== id)}
            schedules={schedules}
            submitting={mutation.isPending}
            submitLabel="Update Employee"
            onCancel={() => router.push(`/employees/${id}`)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({
                id,
                input: { ...values, managerId: values.managerId || undefined },
              });
              router.push(`/employees/${id}`);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Employee could not be updated.
        </p>
      )}
    </>
  );
}
