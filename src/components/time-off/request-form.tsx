"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Employee, TimeOffAllocation, TimeOffRequest, TimeOffType } from "@/types/domain";
import { calculateRequestDuration, findApplicableAllocation } from "@/lib/time-off-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  typeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(2, "Reason is required"),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date cannot be before start date",
  path: ["endDate"],
});

type FormValues = z.infer<typeof schema>;

export function RequestForm({
  initialValues,
  employees,
  types,
  allocations,
  currentEmployeeId,
  isEmployeeOnlyRole,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Submit Leave Request",
}: {
  initialValues?: Partial<TimeOffRequest>;
  employees: Employee[];
  types: TimeOffType[];
  allocations: TimeOffAllocation[];
  currentEmployeeId?: string;
  isEmployeeOnlyRole?: boolean;
  onSubmit: (values: Omit<TimeOffRequest, "id">) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const defaultEmpId = isEmployeeOnlyRole
    ? currentEmployeeId ?? initialValues?.employeeId ?? ""
    : initialValues?.employeeId ?? currentEmployeeId ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      employeeId: defaultEmpId,
      typeId: initialValues?.typeId ?? "",
      startDate: initialValues?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: initialValues?.endDate ?? new Date().toISOString().slice(0, 10),
      reason: initialValues?.reason ?? "",
    },
  });

  const values = watch();
  const selectedType = types.find((t) => t.id === values.typeId || t.name === values.typeId);
  const duration = useMemo(
    () => calculateRequestDuration(values.startDate, values.endDate, selectedType?.unit ?? "DAYS"),
    [values.startDate, values.endDate, selectedType?.unit]
  );

  const matchedAllocation = useMemo(
    () => findApplicableAllocation(allocations, values.employeeId, values.typeId, values.startDate),
    [allocations, values.employeeId, values.typeId, values.startDate]
  );

  const hasNoAllocation = Boolean(selectedType?.allocationRequired && !matchedAllocation);
  const hasInsufficientBalance = Boolean(
    selectedType?.allocationRequired &&
      (hasNoAllocation || (matchedAllocation && matchedAllocation.remainingDays < duration))
  );

  const submit = async (raw: FormValues) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        setError(issue.path[0] as keyof FormValues, { message: issue.message })
      );
      return;
    }

    if (hasNoAllocation) {
      setError("endDate", {
        message: "No active leave allocation found for this employee. Allocation is required for this leave type.",
      });
      return;
    }

    if (hasInsufficientBalance) {
      setError("endDate", {
        message: `Insufficient leave balance. Remaining: ${matchedAllocation?.remainingDays ?? 0} days, Requested: ${duration} days`,
      });
      return;
    }

    const typeObj = types.find((t) => t.id === result.data.typeId);
    const typeName = typeObj ? typeObj.name : result.data.typeId;

    await onSubmit({
      ...result.data,
      type: typeName,
      days: duration,
      unit: typeObj?.unit ?? "DAYS",
      allocationId: matchedAllocation?.id,
      status: initialValues?.status ?? "PENDING",
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Employee *
          {isEmployeeOnlyRole ? (
            <Input
              className="mt-2 bg-surface-raised cursor-not-allowed"
              readOnly
              value={
                employees.find((e) => e.id === values.employeeId)
                  ? `${employees.find((e) => e.id === values.employeeId)?.firstName} ${employees.find((e) => e.id === values.employeeId)?.lastName}`
                  : "Authenticated Employee"
              }
            />
          ) : (
            <select className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm" {...register("employeeId")}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeNumber} · {emp.firstName} {emp.lastName} ({emp.department})
                </option>
              ))}
            </select>
          )}
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
          Start Date *
          <Input className="mt-2" type="date" {...register("startDate")} />
          {errors.startDate && <span className="mt-1 block text-xs text-danger">{errors.startDate.message}</span>}
        </label>

        <label className="block text-sm font-medium">
          End Date *
          <Input className="mt-2" type="date" {...register("endDate")} />
          {errors.endDate && <span className="mt-1 block text-xs text-danger">{errors.endDate.message}</span>}
        </label>

        <label className="block text-sm font-medium md:col-span-2">
          Reason / Description *
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border bg-surface-raised p-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            placeholder="Please detail your reason for leave..."
            {...register("reason")}
          />
          {errors.reason && <span className="mt-1 block text-xs text-danger">{errors.reason.message}</span>}
        </label>
      </div>

      <div className="rounded-md border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted">Calculated Request Duration</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {duration} <span className="text-xs font-normal text-text-muted">{selectedType?.unit ?? "DAYS"}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Current Leave Balance</p>
            {matchedAllocation ? (
              <p className="mt-1 text-sm font-semibold text-text-secondary">
                {matchedAllocation.remainingDays} {selectedType?.unit ?? "DAYS"} remaining (out of {matchedAllocation.allocatedDays})
              </p>
            ) : selectedType?.allocationRequired ? (
              <p className="mt-1 text-xs font-semibold text-amber-400">No active allocation found</p>
            ) : (
              <p className="mt-1 text-xs text-text-muted">No allocation required for this type</p>
            )}
          </div>
        </div>

        {hasNoAllocation && (
          <p className="mt-3 text-xs font-semibold text-danger">
            ⚠️ No active leave allocation found for this employee. An allocation must be granted before requesting this leave type.
          </p>
        )}

        {!hasNoAllocation && hasInsufficientBalance && (
          <p className="mt-3 text-xs font-semibold text-danger">
            ⚠️ Requested duration ({duration} days) exceeds available balance ({matchedAllocation?.remainingDays} days).
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || hasInsufficientBalance}>
          {submitting ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
