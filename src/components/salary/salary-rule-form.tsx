"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, Check, CheckCircle2, HelpCircle, Plus } from "lucide-react";
import type { ComputationType, SalaryRule, SalaryRuleCategory, SalaryRuleStatus } from "@/types/domain";
import { validateFormulaSyntax, extractFormulaIdentifiers } from "@/lib/salary-calculator";
import {
  COMPUTATION_TYPES,
  SALARY_RULE_CATEGORIES,
  SALARY_RULE_STATUSES,
} from "@/lib/salary-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(2, "Rule name is required"),
  code: z
    .string()
    .min(2, "Rule code is required")
    .regex(/^[A-Z0-9_]+$/, "Code must contain only uppercase letters, numbers, and underscores (e.g. BASIC)"),
  category: z.enum(["BASIC", "ALLOWANCE", "GROSS", "DEDUCTION", "NET"]),
  sequence: z.coerce.number().min(1, "Sequence must be at least 1"),
  computationType: z.enum(["FIXED", "PERCENTAGE", "FORMULA"]),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]),
  description: z.string().optional(),
  amount: z.coerce.number().optional(),
  percentage: z.coerce.number().optional(),
  basedOn: z.string().optional(), // Comma separated or single code
  formula: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SalaryRuleFormProps {
  initialValues?: Partial<SalaryRule>;
  allRules: SalaryRule[];
  onSubmit: (values: Omit<SalaryRule, "id">) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function SalaryRuleForm({
  initialValues,
  allRules,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save Rule",
}: SalaryRuleFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: initialValues?.name ?? "",
      code: initialValues?.code ?? "",
      category: (initialValues?.category as any) ?? "BASIC",
      sequence: initialValues?.sequence ?? 10,
      computationType: initialValues?.computationType ?? "FIXED",
      status: initialValues?.status ?? "ACTIVE",
      description: initialValues?.description ?? "",
      amount: initialValues?.amount ?? 0,
      percentage: initialValues?.percentage ?? 10,
      basedOn: (initialValues?.basedOn ?? ["BASIC"]).join(", "),
      formula: initialValues?.formula ?? "",
    },
  });

  const selectedComputationType = watch("computationType");
  const currentCode = watch("code");
  const currentSequence = watch("sequence");
  const currentFormula = watch("formula") || "";
  const currentBasedOn = watch("basedOn") || "";

  // Real-time formula syntax validation
  const formulaValidation = useMemo(() => {
    if (selectedComputationType !== "FORMULA") return { valid: true };
    if (!currentFormula.trim()) return { valid: false, error: "Formula is required." };
    return validateFormulaSyntax(currentFormula);
  }, [selectedComputationType, currentFormula]);

  // Check code uniqueness
  const codeUniqueError = useMemo(() => {
    if (!currentCode) return null;
    const upper = currentCode.trim().toUpperCase();
    const existing = allRules.find(
      (r) => r.code.toUpperCase() === upper && r.id !== initialValues?.id
    );
    if (existing) {
      return `Rule code "${upper}" is already used by "${existing.name}". Codes must be unique.`;
    }
    return null;
  }, [currentCode, allRules, initialValues]);

  // Identify available rule codes for formula/basis helpers
  const otherRules = useMemo(() => {
    return allRules
      .filter((r) => r.id !== initialValues?.id)
      .sort((a, b) => a.sequence - b.sequence);
  }, [allRules, initialValues]);

  // Warn if referencing rules with higher sequence
  const sequenceWarnings = useMemo(() => {
    const warnings: string[] = [];
    const thisSeq = Number(currentSequence) || 0;

    let referencedCodes: string[] = [];
    if (selectedComputationType === "PERCENTAGE") {
      referencedCodes = currentBasedOn.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (selectedComputationType === "FORMULA") {
      referencedCodes = extractFormulaIdentifiers(currentFormula);
    }

    referencedCodes.forEach((code) => {
      const found = otherRules.find((r) => r.code.toUpperCase() === code);
      if (!found) {
        warnings.push(`Referenced rule "${code}" does not exist in the current rule set.`);
      } else if (found.sequence >= thisSeq) {
        warnings.push(
          `Sequence warning: "${code}" has sequence ${found.sequence}, which is ≥ this rule's sequence (${thisSeq}). Move this rule after "${code}" to avoid calculation errors.`
        );
      }
    });

    return warnings;
  }, [selectedComputationType, currentBasedOn, currentFormula, currentSequence, otherRules]);

  // Helper to append token into formula
  const insertFormulaToken = (token: string) => {
    const trimmed = currentFormula.trim();
    if (!trimmed) {
      setValue("formula", token);
    } else {
      setValue("formula", `${trimmed} ${token}`);
    }
  };

  const submit = async (values: FormValues) => {
    setFormError(null);

    const codeUpper = values.code.trim().toUpperCase();

    // Check code uniqueness
    if (codeUniqueError) {
      setError("code", { message: codeUniqueError });
      return;
    }

    if (values.computationType === "FIXED" && (values.amount === undefined || isNaN(values.amount))) {
      setError("amount", { message: "Amount is required for fixed calculation." });
      return;
    }

    if (values.computationType === "PERCENTAGE") {
      if (values.percentage === undefined || isNaN(values.percentage)) {
        setError("percentage", { message: "Percentage value is required." });
        return;
      }
      if (!values.basedOn || !values.basedOn.trim()) {
        setError("basedOn", { message: "Calculation basis rule code is required (e.g. BASIC)." });
        return;
      }
    }

    if (values.computationType === "FORMULA") {
      if (!values.formula || !values.formula.trim()) {
        setError("formula", { message: "Formula is required." });
        return;
      }
      const syntax = validateFormulaSyntax(values.formula);
      if (!syntax.valid) {
        setError("formula", { message: syntax.error || "Invalid formula syntax." });
        return;
      }
    }

    const basedOnArray = values.basedOn
      ? values.basedOn.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : ["BASIC"];

    try {
      await onSubmit({
        code: codeUpper,
        name: values.name.trim(),
        category: values.category,
        sequence: Number(values.sequence),
        computationType: values.computationType,
        status: values.status,
        description: values.description?.trim(),
        amount: values.computationType === "FIXED" ? Number(values.amount) : undefined,
        percentage: values.computationType === "PERCENTAGE" ? Number(values.percentage) : undefined,
        basedOn: values.computationType === "PERCENTAGE" ? basedOnArray : undefined,
        formula: values.computationType === "FORMULA" ? (values.formula ? values.formula.trim() : "") : undefined,
      });
    } catch (err: any) {
      setFormError(err.message || "Failed to save salary rule.");
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {formError && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Basic Configuration Card */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold">General Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-text-muted">Rule Name *</label>
            <Input
              className="mt-1.5"
              placeholder="e.g. House Rent Allowance"
              {...register("name")}
            />
            {errors.name && (
              <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted">Rule Code *</label>
            <Input
              className="mt-1.5 font-mono uppercase"
              placeholder="e.g. HRA"
              {...register("code", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            {errors.code ? (
              <span className="mt-1 block text-xs text-danger">{errors.code.message}</span>
            ) : codeUniqueError ? (
              <span className="mt-1 block text-xs text-danger">{codeUniqueError}</span>
            ) : (
              <span className="mt-1 block text-[11px] text-text-muted">
                Unique identifier used in formulas and payslip lines.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted">Category *</label>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm focus:border-primary focus:outline-none"
              {...register("category")}
            >
              {SALARY_RULE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} ({cat.kind})
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="mt-1 block text-xs text-danger">{errors.category.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted">
              Execution Sequence *
            </label>
            <Input
              type="number"
              className="mt-1.5 font-mono"
              placeholder="10, 20, 30..."
              {...register("sequence")}
            />
            {errors.sequence ? (
              <span className="mt-1 block text-xs text-danger">{errors.sequence.message}</span>
            ) : (
              <span className="mt-1 block text-[11px] text-text-muted">
                Rules execute in ascending sequence order (e.g. Basic = 10, HRA = 20, Gross = 40).
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted">Status</label>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm focus:border-primary focus:outline-none"
              {...register("status")}
            >
              {SALARY_RULE_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted">Description</label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Standard tax or allowance description"
              {...register("description")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Computation Configuration Card */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold">Computation Logic</CardTitle>
          <p className="mt-1 text-xs text-text-muted">
            Choose how this rule is evaluated during salary computation.
          </p>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {/* Computation Type Selection */}
          <div className="grid gap-3 sm:grid-cols-3">
            {COMPUTATION_TYPES.map((type) => {
              const isSelected = selectedComputationType === type.value;
              return (
                <label
                  key={type.value}
                  className={`flex cursor-pointer flex-col rounded-lg border p-3.5 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-text-primary"
                      : "border-border/60 bg-surface-raised/40 text-text-muted hover:border-border hover:text-text-primary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{type.label}</span>
                    <input
                      type="radio"
                      value={type.value}
                      {...register("computationType")}
                      className="size-4 text-primary accent-primary"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-text-muted leading-relaxed">
                    {type.description}
                  </p>
                </label>
              );
            })}
          </div>

          {/* Configuration for FIXED */}
          {selectedComputationType === "FIXED" && (
            <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-4 space-y-3">
              <label className="block text-xs font-semibold text-text-secondary">
                Fixed Amount (₹) *
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-text-muted">₹</span>
                <Input
                  type="number"
                  className="pl-7 font-mono text-sm"
                  placeholder="60000"
                  {...register("amount")}
                />
              </div>
              {errors.amount && (
                <span className="block text-xs text-danger">{errors.amount.message}</span>
              )}
              <p className="text-[11px] text-text-muted">
                Fixed amount added to the payslip. For basic salary, this serves as the contract standard.
              </p>
            </div>
          )}

          {/* Configuration for PERCENTAGE */}
          {selectedComputationType === "PERCENTAGE" && (
            <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary">
                    Percentage (%) *
                  </label>
                  <div className="relative max-w-xs mt-1.5">
                    <Input
                      type="number"
                      step="any"
                      className="pr-7 font-mono text-sm"
                      placeholder="20"
                      {...register("percentage")}
                    />
                    <span className="absolute right-3 top-2.5 text-sm font-semibold text-text-muted">%</span>
                  </div>
                  {errors.percentage && (
                    <span className="mt-1 block text-xs text-danger">{errors.percentage.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary">
                    Based On (Rule Code) *
                  </label>
                  <Input
                    className="mt-1.5 font-mono uppercase text-sm"
                    placeholder="e.g. BASIC"
                    {...register("basedOn")}
                  />
                  {errors.basedOn && (
                    <span className="mt-1 block text-xs text-danger">{errors.basedOn.message}</span>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                    <span>Quick Select:</span>
                    {otherRules.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setValue("basedOn", r.code)}
                        className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono hover:border-primary hover:text-primary"
                      >
                        {r.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration for FORMULA */}
          {selectedComputationType === "FORMULA" && (
            <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-secondary">
                    Formula Expression *
                  </label>
                  {formulaValidation.valid ? (
                    <span className="flex items-center gap-1 text-[11px] text-green-400 font-medium">
                      <CheckCircle2 className="size-3" /> Syntax Valid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-danger font-medium">
                      <AlertTriangle className="size-3" /> {formulaValidation.error}
                    </span>
                  )}
                </div>
                <Input
                  className="mt-1.5 font-mono text-sm tracking-wider uppercase"
                  placeholder="e.g. BASIC + HRA + TRANSPORT"
                  {...register("formula")}
                />
                {errors.formula && (
                  <span className="mt-1 block text-xs text-danger">{errors.formula.message}</span>
                )}
              </div>

              {/* Clickable formula builder tool */}
              <div className="space-y-2 rounded-md border border-border/40 bg-surface/80 p-3">
                <p className="text-[11px] font-semibold text-text-secondary">
                  Formula Builder Tokens (Click to insert):
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-text-muted">Rules:</span>
                  {otherRules.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => insertFormulaToken(r.code)}
                      className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary hover:bg-primary/20"
                    >
                      {r.code}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-text-muted">Operators:</span>
                  {["+", "-", "*", "/", "(", ")"].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => insertFormulaToken(op)}
                      className="rounded border border-border/60 bg-surface-raised px-2.5 py-0.5 font-mono text-xs font-bold text-text-secondary hover:border-border hover:text-text-primary"
                    >
                      {op}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setValue("formula", "")}
                    className="rounded border border-border/40 px-2 py-0.5 text-[11px] text-text-muted hover:text-text-secondary ml-auto"
                  >
                    Clear Formula
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-text-secondary">
                <HelpCircle className="size-4 shrink-0 text-blue-400 mt-0.5" />
                <span>
                  Safe controlled evaluation strictly supports arithmetic (+, -, *, /), parentheses, numbers, and rule codes. Arbitrary JavaScript execution is completely prohibited.
                </span>
              </div>
            </div>
          )}

          {/* Sequence Warnings */}
          {sequenceWarnings.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Dependency Notice</span>
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11px]">
                {sequenceWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving Rule..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
