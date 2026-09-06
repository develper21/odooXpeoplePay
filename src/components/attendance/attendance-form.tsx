"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type {
  AttendanceRecord,
  Employee,
  WorkingSchedule,
} from "@/types/domain";
import {
  deriveAttendanceStatus,
  scheduleDayForDate,
} from "@/lib/attendance-utils";
import { calculateWorkedMinutes, formatDuration } from "@/lib/time-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  checkIn: z.string(),
  checkOut: z.string(),
  notes: z.string().optional(),
});
type Values = z.infer<typeof schema>;
export function AttendanceForm({
  initialValues,
  employees,
  schedules,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save Attendance",
}: {
  initialValues?: Partial<AttendanceRecord>;
  employees: Employee[];
  schedules: WorkingSchedule[];
  onSubmit: (values: Omit<AttendanceRecord, "id">) => Promise<void>;
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
  } = useForm<Values>({
    defaultValues: {
      employeeId: initialValues?.employeeId ?? "",
      date: initialValues?.date ?? new Date().toISOString().slice(0, 10),
      checkIn: initialValues?.checkIn ?? "",
      checkOut: initialValues?.checkOut ?? "",
      notes: initialValues?.notes ?? "",
    },
  });
  const values = watch();
  const selectedEmployee = employees.find(
    (employee) => employee.id === values.employeeId,
  );
  const schedule = schedules.find(
    (item) => item.id === selectedEmployee?.scheduleId,
  );
  const scheduleDay = scheduleDayForDate(values.date, schedule);
  const workedMinutes = useMemo(
    () => calculateWorkedMinutes(values.checkIn, values.checkOut, 0),
    [values.checkIn, values.checkOut],
  );
  const submit = async (raw: Values) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        setError(issue.path[0] as keyof Values, { message: issue.message }),
      );
      return;
    }
    const manuallyEdited =
      Boolean(initialValues?.id) || Boolean(initialValues?.manuallyEdited);
    await onSubmit({
      ...result.data,
      checkOut: result.data.checkOut || undefined,
      breakMinutes: 0,
      workedMinutes: workedMinutes || undefined,
      manuallyEdited,
      status: deriveAttendanceStatus(
        {
          checkIn: result.data.checkIn,
          checkOut: result.data.checkOut,
          manuallyEdited,
        },
        scheduleDay,
      ),
    });
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
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
        <label className="block text-sm font-medium">
          Date *<Input className="mt-2" type="date" {...register("date")} />
          {errors.date && (
            <span className="mt-1 block text-xs text-danger">
              {errors.date.message}
            </span>
          )}
        </label>
        <label className="block text-sm font-medium">
          Check in
          <Input className="mt-2" type="time" {...register("checkIn")} />
        </label>
        <label className="block text-sm font-medium">
          Check out
          <Input className="mt-2" type="time" {...register("checkOut")} />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Notes
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border bg-surface-raised p-3 text-sm"
            {...register("notes")}
          />
        </label>
      </div>
      <div className="rounded-md border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted">Calculated worked hours</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {formatDuration(workedMinutes)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Schedule context</p>
            <p className="mt-1 text-sm text-text-secondary">
              {schedule?.name ?? "Not assigned"} ·{" "}
              {scheduleDay?.startTime
                ? `${scheduleDay.startTime}–${scheduleDay.endTime}`
                : "No working day"}
            </p>
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
