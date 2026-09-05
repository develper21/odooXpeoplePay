"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import type { TimeOffType } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  name: z.string().min(2, "Type name is required"),
  unit: z.enum(["DAYS", "HOURS"]),
  allocationRequired: z.boolean(),
  approvalRequired: z.boolean(),
  payrollIntegration: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type FormValues = z.infer<typeof schema>;

export function TimeOffTypeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save Leave Type",
}: {
  initialValues?: Partial<TimeOffType>;
  onSubmit: (values: Omit<TimeOffType, "id">) => Promise<void>;
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
      name: initialValues?.name ?? "",
      unit: initialValues?.unit ?? "DAYS",
      allocationRequired: initialValues?.allocationRequired ?? true,
      approvalRequired: initialValues?.approvalRequired ?? true,
      payrollIntegration: initialValues?.payrollIntegration ?? true,
      status: initialValues?.status ?? "ACTIVE",
    },
  });

  const submit = async (raw: FormValues) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        setError(issue.path[0] as keyof FormValues, { message: issue.message })
      );
      return;
    }
    await onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Name *
          <Input className="mt-2" {...register("name")} placeholder="e.g. Annual Leave" />
          {errors.name && <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>}
        </label>

        <label className="block text-sm font-medium">
          Unit *
          <select className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm" {...register("unit")}>
            <option value="DAYS">Days</option>
            <option value="HOURS">Hours</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Status *
          <select className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm" {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      <div className="space-y-3 rounded-md border bg-surface-raised p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Policy Settings</h3>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-primary" {...register("allocationRequired")} />
          Allocation Required (Employees must be granted a leave balance)
        </label>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-primary" {...register("approvalRequired")} />
          Approval Required (Manager/HR approval required before leave is confirmed)
        </label>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-primary" {...register("payrollIntegration")} />
          Payroll Integration (Include in payroll computations and payslip deductions)
        </label>
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
