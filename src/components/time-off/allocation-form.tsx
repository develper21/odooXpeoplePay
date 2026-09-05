"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Employee, TimeOffAllocation, TimeOffType } from "@/types/domain";
import { calculateAllocationRemaining } from "@/lib/time-off-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  typeId: z.string().min(1, "Leave type is required"),
  allocatedDays: z.coerce.number().min(1, "Allocated quantity must be at least 1"),
  validFrom: z.string().min(1, "Valid from date is required"),
  validTo: z.string().min(1, "Valid to date is required"),
  status: z.enum(["ACTIVE", "EXPIRED", "DRAFT", "INACTIVE", "PENDING", "APPROVED"]),
}).refine((data) => data.validTo >= data.validFrom, {
  message: "Valid To date cannot be before Valid From date",
  path: ["validTo"],
});

type FormValues = z.infer<typeof schema>;

export function AllocationForm({
  initialValues,
  employees,
  types,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save Allocation",
}: {
  initialValues?: Partial<TimeOffAllocation>;
  employees: Employee[];
  types: TimeOffType[];
  onSubmit: (values: Omit<TimeOffAllocation, "id">) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      employeeId: initialValues?.employeeId ?? "",
      typeId: initialValues?.typeId ?? "",
      allocatedDays: initialValues?.allocatedDays ?? 24,
      validFrom: initialValues?.validFrom ?? "2026-01-01",
      validTo: initialValues?.validTo ?? "2026-12-31",
      status: initialValues?.status ?? "ACTIVE",
    },
  });

  const values = watch();
  const selectedType = types.find((t) => t.id === values.typeId || t.name === values.typeId);
  const used = initialValues?.usedDays ?? 0;
  const remaining = calculateAllocationRemaining(values.allocatedDays || 0, used);

  const submit = async (raw: FormValues) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        setError(issue.path[0] as keyof FormValues, { message: issue.message })
      );
      return;
    }

    const typeObj = types.find((t) => t.id === result.data.typeId);
    const typeName = typeObj ? typeObj.name : result.data.typeId;

    await onSubmit({
      ...result.data,
      type: typeName,
      usedDays: used,
      remainingDays: remaining,
      unit: typeObj?.unit ?? "DAYS",
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Employee *
          <select className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm" {...register("employeeId")}>
            <option value="">Select employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employeeNumber} · {emp.firstName} {emp.lastName} ({emp.department})
              </option>
            ))}
          </select>
          {errors.employeeId && <span className="mt-1 block text-xs text-danger">{errors.employeeId.message}</span>}
        </label>

        <label className="block text-sm font-medium">
          Time Off Type *
          <select className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm" {...register("typeId")}>
            <option value="">Select leave type</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.unit})
              </option>
            ))}
          </select>
          {errors.typeId && <span className="mt-1 block text-xs text-danger">{errors.typeId.message}</span>}
        </label>

        <label className="block text-sm font-medium">
          Allocated Quantity ({selectedType?.unit ?? "DAYS"}) *
          <Input className="mt-2" type="number" min="1" {...register("allocatedDays")} />
          {errors.allocatedDays && <span className="mt-1 block text-xs text-danger">{errors.allocatedDays.message}</span>}
        </label>

        <label className="block text-sm font-medium">
          Status *
          <select className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm" {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="EXPIRED">Expired</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Valid From *
          <Input className="mt-2" type="date" {...register("validFrom")} />
          {errors.validFrom && <span className="mt-1 block text-xs text-danger">{errors.validFrom.message}</span>}
        </label>

        <label className="block text-sm font-medium">
          Valid To *
          <Input className="mt-2" type="date" {...register("validTo")} />
          {errors.validTo && <span className="mt-1 block text-xs text-danger">{errors.validTo.message}</span>}
        </label>
      </div>

      <div className="rounded-md border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted">Calculated Remaining Balance</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {remaining} <span className="text-xs font-normal text-text-muted">{selectedType?.unit ?? "DAYS"}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Current Taken Quantity</p>
            <p className="mt-1 text-sm font-semibold text-text-secondary">{used} {selectedType?.unit ?? "DAYS"}</p>
          </div>
        </div>
      </div>

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
