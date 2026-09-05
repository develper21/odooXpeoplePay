"use client";

import { useState, useMemo } from "react";
import { Calculator, AlertTriangle, CheckCircle2, RotateCcw, Info } from "lucide-react";
import type { SalaryRule } from "@/types/domain";
import { calculateSalary, validateRuleDependencies } from "@/lib/salary-calculator";
import { CATEGORY_LABEL_MAP, COMPUTATION_TYPE_LABEL_MAP } from "@/lib/salary-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SalaryCalculationPreviewProps {
  rules: SalaryRule[];
  initialBaseSalary?: number;
  title?: string;
  description?: string;
}

export function SalaryCalculationPreview({
  rules,
  initialBaseSalary = 60000,
  title = "Salary Calculation Preview",
  description = "Simulate live rule execution order and verify dependent computations before finalizing payroll.",
}: SalaryCalculationPreviewProps) {
  const [baseSalary, setBaseSalary] = useState<number>(initialBaseSalary);

  // Validate dependencies & cycle
  const dependencyIssues = useMemo(() => {
    return validateRuleDependencies(rules);
  }, [rules]);

  // Execute calculation in sequence order
  const calculationResult = useMemo(() => {
    return calculateSalary(rules, { baseSalary: Number(baseSalary) || 0 });
  }, [rules, baseSalary]);

  const presetSalaries = [40000, 60000, 75000, 100000, 150000];

  return (
    <Card className="border-border/70 bg-surface/90">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Calculator className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <p className="text-xs text-text-muted">{description}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <Info className="size-3" />
            Config Preview
          </span>
        </div>

        {/* Live Input Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border/40 bg-surface-raised/60 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">Base Salary (Input):</span>
            <div className="relative w-36">
              <span className="absolute left-2.5 top-2 text-xs font-semibold text-text-muted">₹</span>
              <Input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                className="h-8 pl-6 text-xs font-semibold"
                placeholder="60000"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Presets:</span>
            {presetSalaries.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBaseSalary(preset)}
                className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
                  baseSalary === preset
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border/60 bg-surface text-text-muted hover:text-text-primary"
                }`}
              >
                ₹{(preset / 1000).toFixed(0)}k
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBaseSalary(initialBaseSalary)}
              title="Reset to default"
              className="h-7 px-2 text-xs text-text-muted hover:text-text-primary"
            >
              <RotateCcw className="size-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {/* Dependency Warnings if any */}
        {dependencyIssues.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-400">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Rule Configuration Warnings ({dependencyIssues.length})</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px]">
              {dependencyIssues.map((issue, idx) => (
                <li key={idx}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Calculation Errors if any */}
        {calculationResult.errors.length > 0 && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Calculation Errors ({calculationResult.errors.length})</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px]">
              {calculationResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Breakdown Table */}
        {calculationResult.rules.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-xs text-text-muted">
            No salary rules selected for computation preview.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-surface-raised/80 text-[11px] font-semibold text-text-muted">
                <tr>
                  <th className="px-3 py-2.5">Seq</th>
                  <th className="px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Rule Name</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Computation</th>
                  <th className="px-3 py-2.5 text-right">Calculated Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {calculationResult.rules.map((rule) => {
                  const isDeduction = rule.category === "DEDUCTION";
                  const isTotal = rule.category === "GROSS" || rule.category === "NET";
                  const isBasic = rule.category === "BASIC";

                  let rowBg = "hover:bg-surface-raised/40";
                  if (rule.category === "GROSS") rowBg = "bg-primary/5 font-semibold";
                  if (rule.category === "NET") rowBg = "bg-green-500/5 font-bold";

                  return (
                    <tr key={rule.ruleId || rule.code} className={rowBg}>
                      <td className="px-3 py-2 font-mono text-[11px] text-text-muted">
                        <span className="rounded bg-surface-raised px-1.5 py-0.5 border border-border/40">
                          {rule.sequence}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-primary">
                        {rule.code}
                      </td>
                      <td className="px-3 py-2 text-text-primary">
                        {rule.name}
                        {rule.error && (
                          <span className="ml-2 inline-block text-[10px] text-danger" title={rule.error}>
                            ⚠ Error
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isBasic
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : rule.category === "ALLOWANCE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isDeduction
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : rule.category === "GROSS"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-green-500/10 text-green-400 border border-green-500/20"
                          }`}
                        >
                          {CATEGORY_LABEL_MAP[rule.category] || rule.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-text-muted">
                        <span className="text-text-secondary">{COMPUTATION_TYPE_LABEL_MAP[rule.computationType] || rule.computationType}: </span>
                        <span>{rule.expressionDisplay}</span>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${
                        isDeduction
                          ? "text-red-400"
                          : isTotal
                          ? "text-text-primary"
                          : "text-text-primary"
                      }`}>
                        {isDeduction && rule.amount > 0 ? "- " : ""}
                        ₹{rule.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-3 text-center">
            <p className="text-[11px] font-medium text-text-muted">Basic Salary</p>
            <p className="mt-1 text-sm font-bold text-text-primary font-mono">
              ₹{calculationResult.totals.basic.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-3 text-center">
            <p className="text-[11px] font-medium text-text-muted">Allowances</p>
            <p className="mt-1 text-sm font-bold text-emerald-400 font-mono">
              +₹{calculationResult.totals.allowances.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-center">
            <p className="text-[11px] font-medium text-primary">Gross Salary</p>
            <p className="mt-1 text-base font-extrabold text-primary font-mono">
              ₹{calculationResult.totals.gross.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center">
            <p className="text-[11px] font-medium text-red-400">Total Deductions</p>
            <p className="mt-1 text-sm font-bold text-red-400 font-mono">
              -₹{calculationResult.totals.deductions.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium text-green-400">Net Salary</p>
            <p className="mt-1 text-base font-extrabold text-green-400 font-mono">
              ₹{calculationResult.totals.net.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-green-400" />
            Rules execute deterministically in ascending sequence order
          </span>
          <span>{calculationResult.rules.length} rule(s) evaluated</span>
        </div>
      </CardContent>
    </Card>
  );
}
