"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Contract, Employee, SalaryStructure } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    employeeId: z.string().min(1, "Employee is required"),
    reference: z.string().min(3, "Contract reference is required"),
    title: z.string().min(2, "Contract title is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    department: z.string().min(1, "Department is required"),
    position: z.string().min(2, "Position is required"),
    monthlySalary: z.coerce.number().positive("Wage must be greater than zero"),
    salaryStructureId: z.string().optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "DRAFT", "TERMINATED"]),
  })
  .refine((values) => !values.endDate || values.endDate >= values.startDate, {
    message: "End date cannot be before start date",
    path: ["endDate"],
  });
type FormValues = z.infer<typeof schema>;

export function ContractForm({
  initialValues,
  employees,
  structures,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save Contract",
}: {
  initialValues?: Partial<Contract>;
  employees: Employee[];
  structures: SalaryStructure[];
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      employeeId: initialValues?.employeeId ?? "",
      reference: initialValues?.reference ?? "",
      title: initialValues?.title ?? "Permanent Employment",
      startDate:
        initialValues?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: initialValues?.endDate ?? "",
      department: initialValues?.department ?? "",
      position: initialValues?.position ?? "",
      monthlySalary: initialValues?.monthlySalary ?? 0,
      salaryStructureId: initialValues?.salaryStructureId ?? "",
      status: initialValues?.status ?? "DRAFT",
    },
  });
  const submit = async (values: FormValues) => {
    const result = schema.safeParse(values);
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        setError(issue.path[0] as keyof FormValues, { message: issue.message }),
      );
      return;
    }
    await onSubmit(result.data);
  };
  const field = (name: keyof FormValues, label: string, type = "text") => (
    <label className="block text-sm font-medium">
      {label}
      <Input className="mt-2" type={type} {...register(name)} />
      {errors[name] && (
        <span className="mt-1 block text-xs text-danger">
          {errors[name]?.message}
        </span>
      )}
    </label>
  );
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <section>
        <h2 className="border-b pb-3 text-sm font-semibold">
          Contract details
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {
            <label className="block text-sm font-medium">
              Employee *
              <select
                className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm"
                {...register("employeeId")}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeNumber} · {employee.firstName}{" "}
                    {employee.lastName}
                  </option>
                ))}
              </select>
              {errors.employeeId && (
                <span className="mt-1 block text-xs text-danger">
                  {errors.employeeId.message}
                </span>
              )}
            </label>
          }
          {field("reference", "Contract ID *")}
          {field("title", "Contract title *")}
          {field("startDate", "Start date *", "date")}
          {field("endDate", "End date", "date")}
          {field("department", "Department *")}
          {field("position", "Position *")}
          {field("monthlySalary", "Monthly wage *", "number")}
          {
            <label className="block text-sm font-medium">
              Salary structure
              <select
                className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm"
                {...register("salaryStructureId")}
              >
                <option value="">No structure selected</option>
                {structures.map((structure) => (
                  <option key={structure.id} value={structure.id}>
                    {structure.name}
                  </option>
                ))}
              </select>
            </label>
          }
          {
            <label className="block text-sm font-medium">
              Status
              <select
                className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm"
                {...register("status")}
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </label>
          }
        </div>
      </section>
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
