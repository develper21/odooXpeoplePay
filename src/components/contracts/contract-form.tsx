"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Sparkles,
  Calculator,
  Sliders,
  Check,
  TrendingUp,
  Building2,
  Award,
} from "lucide-react";
import type { Contract, Employee, SalaryStructure } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  calculateSalaryRecommendation,
  calculateTenureYears,
  DEPARTMENT_BENCHMARKS,
} from "@/lib/salary-calculator";

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
  const [salaryMode, setSalaryMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [experienceYears, setExperienceYears] = useState<number>(() => {
    if (initialValues?.employeeId) {
      const emp = employees.find((e) => e.id === initialValues.employeeId);
      return calculateTenureYears(emp?.joinedOn) || 2;
    }
    return 2;
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const watchedEmployeeId = watch("employeeId");
  const watchedDepartment = watch("department");
  const watchedMonthlySalary = watch("monthlySalary");

  // When an employee is selected, automatically fill Department, Position, and Experience
  useEffect(() => {
    if (!watchedEmployeeId) return;
    const selectedEmp = employees.find((e) => e.id === watchedEmployeeId);
    if (selectedEmp) {
      if (!initialValues?.id || !watchedDepartment) {
        if (selectedEmp.department) setValue("department", selectedEmp.department);
        if (selectedEmp.position) setValue("position", selectedEmp.position);
      }
      const exp = calculateTenureYears(selectedEmp.joinedOn);
      setExperienceYears(exp > 0 ? exp : 1.5);
    }
  }, [watchedEmployeeId, employees, setValue, initialValues?.id, watchedDepartment]);

  // Compute recommendation based on department + experience
  const recommendation = useMemo(() => {
    return calculateSalaryRecommendation({
      department: watchedDepartment || "Engineering",
      experienceYears: experienceYears,
    });
  }, [watchedDepartment, experienceYears]);

  // If in AUTO mode, keep monthlySalary synchronized with recommendation
  useEffect(() => {
    if (salaryMode === "AUTO" && recommendation.recommendedSalary > 0) {
      setValue("monthlySalary", recommendation.recommendedSalary);
    }
  }, [salaryMode, recommendation.recommendedSalary, setValue]);

  const applyRecommendation = () => {
    setValue("monthlySalary", recommendation.recommendedSalary);
  };

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
          Contract Details & Employee Assignment
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                  {employee.lastName} ({employee.department || "General"})
                </option>
              ))}
            </select>
            {errors.employeeId && (
              <span className="mt-1 block text-xs text-danger">
                {errors.employeeId.message}
              </span>
            )}
          </label>

          {field("reference", "Contract Reference ID *")}
          {field("title", "Contract Title *")}
          {field("startDate", "Start Date *", "date")}
          {field("endDate", "End Date", "date")}

          <label className="block text-sm font-medium">
            Department *
            <select
              className="mt-2 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm"
              {...register("department")}
            >
              <option value="">Select Department</option>
              {Object.keys(DEPARTMENT_BENCHMARKS).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
              <option value="General">Other / General</option>
            </select>
            {errors.department && (
              <span className="mt-1 block text-xs text-danger">
                {errors.department.message}
              </span>
            )}
          </label>

          {field("position", "Job Position *")}

          <label className="block text-sm font-medium">
            Salary Structure
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
        </div>
      </section>

      {/* Salary Determination Module: Department + Experience vs Manual */}
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <Calculator className="size-4 text-primary" />
              Salary Determination Model
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Decide wage automatically using Department benchmarks + Years of Experience, or set a custom manual wage.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setSalaryMode("AUTO")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                salaryMode === "AUTO"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Sparkles className="size-3.5" />
              Dept + Experience Matrix
            </button>
            <button
              type="button"
              onClick={() => setSalaryMode("MANUAL")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                salaryMode === "MANUAL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Sliders className="size-3.5" />
              Manual Wage Input
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* Left Column: Experience Configuration & Matrix Controls */}
          <div className="space-y-4 rounded-lg border border-border/60 bg-surface p-4 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary">
                  Experience / Tenure (Years)
                </label>
                <span className="font-mono text-xs font-bold text-primary">
                  {experienceYears} {experienceYears === 1 ? "Year" : "Years"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseFloat(e.target.value) || 0)}
                className="mt-2.5 h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-raised accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] text-text-muted">
                <span>0 yrs (Entry)</span>
                <span>5 yrs (Senior)</span>
                <span>12+ yrs (Exec)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Seniority Tier:</span>
                <Badge variant={recommendation.tier.badgeVariant}>
                  <Award className="mr-1 size-3" />
                  {recommendation.tier.name}
                </Badge>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="text-text-muted">Department Base:</span>
                <span className="font-semibold text-text-primary">
                  ₹{recommendation.baseSalary.toLocaleString()}/mo
                </span>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-text-muted">Experience Bonus:</span>
                <span className="font-semibold text-success">
                  +₹{recommendation.experienceBonus.toLocaleString()}/mo
                </span>
              </div>
            </div>
          </div>

          {/* Middle/Right Column: Live Calculation Breakdown & Input */}
          <div className="space-y-4 lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">
                    Recommended Benchmark Wage
                  </span>
                  <Badge variant="info">Smart Grid</Badge>
                </div>
                <p className="mt-1 font-mono text-2xl font-bold text-primary">
                  ₹{recommendation.recommendedSalary.toLocaleString()}
                  <span className="text-xs font-normal text-text-muted"> / month</span>
                </p>
                <p className="mt-1 text-[11px] text-text-muted">
                  Band for {recommendation.tier.name}: ₹{recommendation.salaryRange.min.toLocaleString()} – ₹{recommendation.salaryRange.max.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Monthly Contract Wage (₹) *
                </label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    type="number"
                    step="100"
                    placeholder="Enter wage amount"
                    {...register("monthlySalary")}
                    className="font-mono text-base font-bold"
                  />
                  {salaryMode === "MANUAL" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={applyRecommendation}
                      title="Apply recommended benchmark wage"
                      className="shrink-0"
                    >
                      <Sparkles className="size-3.5" />
                      Apply
                    </Button>
                  )}
                </div>
                {errors.monthlySalary && (
                  <span className="mt-1 block text-xs text-danger">
                    {errors.monthlySalary.message}
                  </span>
                )}
                {watchedMonthlySalary > 0 && (
                  <p className="mt-1 text-[11px] text-text-muted">
                    Annual Package: ₹{(watchedMonthlySalary * 12).toLocaleString()} / year
                  </p>
                )}
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Salary Calculation Breakdown
              </h4>
              <div className="mt-2 divide-y divide-border/50 text-xs">
                {recommendation.breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="font-medium text-text-primary">{item.label}</p>
                      <p className="text-[11px] text-text-muted">{item.description}</p>
                    </div>
                    <span className="font-mono font-semibold text-text-primary">
                      ₹{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
