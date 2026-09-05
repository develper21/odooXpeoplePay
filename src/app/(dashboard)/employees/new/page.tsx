"use client";

import { useRouter } from "next/navigation";
import { useEmployees, useCreateEmployee, useSchedules } from "@/hooks/use-data";
import { employeeName } from "@/lib/hr-utils";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeeForm } from "@/components/employees/employee-form";

export default function NewEmployeePage() { const router = useRouter(); const { data: employees = [] } = useEmployees(); const { data: schedules = [] } = useSchedules(); const mutation = useCreateEmployee(); return <><PageHeader title="New Employee" description="Create a workforce record and connect it to HR operations." /><Card><CardContent className="p-5 sm:p-7"><EmployeeForm managers={employees} schedules={schedules} submitting={mutation.isPending} onCancel={() => router.back()} onSubmit={async (values) => { await mutation.mutateAsync({ ...values, managerId: values.managerId || undefined, contractId: undefined, salaryStructureId: undefined }); router.push("/employees"); }} /></CardContent></Card>{mutation.isError && <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">Employee could not be created. Please try again.</p>}<p className="sr-only">Employee form for {employees[0] ? employeeName(employees[0]) : "new record"}</p></>; }
