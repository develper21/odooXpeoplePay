"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowDown, ArrowUp, Check, Layers, AlertTriangle } from "lucide-react";
import type { SalaryRule, SalaryStructure, SalaryStructureStatus } from "@/types/domain";
import { sortRulesBySequence } from "@/lib/salary-calculator";
import { CATEGORY_LABEL_MAP, SALARY_STRUCTURE_STATUSES } from "@/lib/salary-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalaryCalculationPreview } from "./salary-calculation-preview";

const schema = z.object({
  name: z.string().min(2, "Structure name is required"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]),
  currency: z.string().default("INR"),
});

type FormValues = z.infer<typeof schema>;

interface SalaryStructureFormProps {
  initialValues?: Partial<SalaryStructure>;
  allRules: SalaryRule[];
  onSubmit: (values: FormValues & { ruleIds: string[] }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function SalaryStructureForm({
  initialValues,
  allRules,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save Structure",
}: SalaryStructureFormProps) {
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(
    initialValues?.ruleIds ?? allRules.slice(0, 7).map((r) => r.id)
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status ?? "ACTIVE",
      currency: initialValues?.currency ?? "INR",
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Map of ruleId to SalaryRule
  const ruleMap = useMemo(() => {
    const map = new Map<string, SalaryRule>();
    allRules.forEach((r) => map.set(r.id, r));
    return map;
  }, [allRules]);

  // Selected rules sorted by sequence
  const activeStructureRules = useMemo(() => {
    const rules = selectedRuleIds
      .map((id) => ruleMap.get(id))
      .filter((r): r is SalaryRule => Boolean(r));
    return sortRulesBySequence(rules);
  }, [selectedRuleIds, ruleMap]);

  // Toggle rule inclusion
  const toggleRule = (ruleId: string) => {
    setSelectedRuleIds((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]
    );
  };

  const selectAll = () => {
    setSelectedRuleIds(allRules.map((r) => r.id));
  };

  const clearAll = () => {
    setSelectedRuleIds([]);
  };

  const submit = async (values: FormValues) => {
    setFormError(null);
    if (selectedRuleIds.length === 0) {
      setFormError("At least one salary rule must be selected for this salary structure.");
      return;
    }

    // Preserve deterministic sequence ordering in ruleIds
    const orderedRuleIds = activeStructureRules.map((r) => r.id);

    try {
      await onSubmit({ ...values, ruleIds: orderedRuleIds });
    } catch (err: any) {
      setFormError(err.message || "Failed to save salary structure.");
    }
  };

  // Sort all available rules by sequence for selection table
  const sortedAllRules = useMemo(() => sortRulesBySequence(allRules), [allRules]);

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {formError && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Structure Meta Card */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold">Structure Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-text-muted">
              Structure Name *
            </label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Regular Salary"
              {...register("name")}
            />
            {errors.name && (
              <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted">Status</label>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm focus:border-primary focus:outline-none"
              {...register("status")}
            >
              {SALARY_STRUCTURE_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-text-muted">Description</label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Standard corporate salary structure with statutory deductions..."
              {...register("description")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Included Rules Selector */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Included Salary Rules</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Select and verify rules included in this structure. Rules execute in ascending sequence order.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {selectedRuleIds.length} of {allRules.length} rules selected
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={selectAll} className="h-8 text-xs">
                Select All
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs text-text-muted">
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-surface-raised text-[11px] font-semibold text-text-muted">
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center">Include</th>
                  <th className="px-3 py-2.5">Seq</th>
                  <th className="px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Computation</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {sortedAllRules.map((rule) => {
                  const isSelected = selectedRuleIds.includes(rule.id);
                  return (
                    <tr
                      key={rule.id}
                      onClick={() => toggleRule(rule.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "opacity-60 hover:bg-surface-raised/40 hover:opacity-100"
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRule(rule.id)}
                          className="size-4 rounded border-border accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-text-muted">
                        <span className="rounded bg-surface-raised px-1.5 py-0.5 border border-border/40">
                          {rule.sequence}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                        {rule.code}
                      </td>
                      <td className="px-3 py-2.5 text-text-primary">{rule.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-semibold text-text-muted">
                          {CATEGORY_LABEL_MAP[rule.category as any] || rule.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted">
                        {rule.computationType === "FIXED" && `Fixed (₹${(rule.amount ?? 0).toLocaleString()})`}
                        {rule.computationType === "PERCENTAGE" && `${rule.percentage}% of ${(rule.basedOn || ["BASIC"]).join(", ")}`}
                        {rule.computationType === "FORMULA" && `Formula: ${rule.formula}`}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            rule.status === "ACTIVE"
                              ? "text-green-400 bg-green-500/10 border border-green-500/20"
                              : "text-slate-400 bg-slate-500/10 border border-slate-500/20"
                          }`}
                        >
                          {rule.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Live Calculation Preview */}
      <SalaryCalculationPreview
        rules={activeStructureRules}
        title="Live Salary Structure Simulation"
        description="Verify calculations using the selected rules above. Evaluates in real-time as rules are added or removed."
      />

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving Structure..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
