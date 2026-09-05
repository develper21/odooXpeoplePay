"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit3,
  Layers,
  LockKeyhole,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useDeleteSalaryRule,
  useSalaryRule,
  useSalaryRules,
  useSalaryStructures,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { extractFormulaIdentifiers } from "@/lib/salary-calculator";
import {
  CATEGORY_LABEL_MAP,
  COMPUTATION_TYPE_LABEL_MAP,
} from "@/lib/salary-constants";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { SalaryTabs } from "@/components/salary/salary-tabs";

export default function SalaryRuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: rule, isLoading, isError } = useSalaryRule(id);
  const { data: allRules = [] } = useSalaryRules();
  const { data: structures = [] } = useSalaryStructures();

  const deleteRule = useDeleteSalaryRule();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = Boolean(user && canAccess(user.role, "salary_rule.update"));
  const canDelete = Boolean(user && canAccess(user.role, "salary_rule.delete"));

  // Check which structures contain this rule
  const referencingStructures = useMemo(() => {
    return structures.filter((s) => s.ruleIds?.includes(id));
  }, [structures, id]);

  // Analyze dependencies of this rule
  const dependencies = useMemo(() => {
    if (!rule) return [];
    let codes: string[] = [];
    if (rule.computationType === "PERCENTAGE") {
      codes = rule.basedOn || ["BASIC"];
    } else if (rule.computationType === "FORMULA" && rule.formula) {
      codes = extractFormulaIdentifiers(rule.formula);
    }

    return codes.map((c) => {
      const target = allRules.find((r) => r.code.toUpperCase() === c.toUpperCase());
      const isSequenceValid = target ? target.sequence < rule.sequence : false;
      return {
        code: c,
        rule: target,
        isValid: Boolean(target),
        isSequenceValid,
      };
    });
  }, [rule, allRules]);

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteRule.mutateAsync(id);
      router.push("/salary-rules");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete salary rule.");
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError || !rule) {
    return <ErrorState message="Salary rule could not be found." />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/salary-rules"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Salary Rules
        </Link>
      </div>

      <PageHeader
        title={rule.name}
        description={rule.description || "Detailed configuration and dependency analysis for this salary rule."}
        action={
          canEdit
            ? { label: "Edit Rule", href: `/salary-rules/${id}/edit` }
            : undefined
        }
      />

      <SalaryTabs />

      {deleteError && (
        <div className="mb-5 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Main Metadata Overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted">Rule Code</p>
          <p className="mt-1 font-mono text-2xl font-black text-primary tracking-wider">
            {rule.code}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-text-muted">Execution Sequence</p>
          <p className="mt-1 font-mono text-2xl font-black text-text-primary">
            {rule.sequence}
          </p>
          <p className="text-[11px] text-text-muted">Order of execution</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-text-muted">Category</p>
          <div className="mt-2">
            <span className="rounded bg-surface-raised border border-border/60 px-2.5 py-1 text-xs font-semibold">
              {CATEGORY_LABEL_MAP[rule.category as any] || rule.category}
            </span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-text-muted">Status</p>
            <div className="mt-2">
              <StatusBadge status={rule.status.toLowerCase() as any} />
            </div>
          </div>
          {canDelete && (
            <div className="pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs"
              >
                <Trash2 className="size-3.5 mr-1" /> Delete Rule
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Column: Computation Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold">Computation Logic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div>
                <p className="text-xs text-text-muted">Computation Method</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {COMPUTATION_TYPE_LABEL_MAP[rule.computationType] || rule.computationType}
                </p>
              </div>

              {rule.computationType === "FIXED" && (
                <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-4">
                  <p className="text-xs text-text-muted">Fixed Monetary Value</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-text-primary">
                    ₹{(rule.amount ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    This amount is evaluated as a static fixed numerical value during payroll calculation.
                  </p>
                </div>
              )}

              {rule.computationType === "PERCENTAGE" && (
                <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-text-muted">Percentage Rate</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                      {rule.percentage}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Calculated on Basis Rule(s)</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(rule.basedOn || ["BASIC"]).map((b) => (
                        <span
                          key={b}
                          className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary pt-1">
                    Evaluated as ({rule.percentage}% × sum of basis rules) during rule sequence execution.
                  </p>
                </div>
              )}

              {rule.computationType === "FORMULA" && (
                <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-4 space-y-3">
                  <p className="text-xs text-text-muted">Formula Expression</p>
                  <div className="mt-1 rounded border border-border bg-surface p-3 font-mono text-sm font-bold text-emerald-400">
                    {rule.formula}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted pt-1">
                    <CheckCircle2 className="size-3.5 text-green-400" />
                    <span>Safe arithmetic expression evaluated against prior rule sequence values.</span>
                  </div>
                </div>
              )}

              {rule.description && (
                <div>
                  <p className="text-xs text-text-muted">Rule Description</p>
                  <p className="mt-1 text-sm text-text-secondary">{rule.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dependency Verification */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold">Rule Dependencies ({dependencies.length})</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Referenced rule codes that must execute before this rule in sequence.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {dependencies.length === 0 ? (
                <p className="p-4 text-xs text-text-muted">
                  This rule has no external dependencies. It computes independently based on static configuration or contract base salary.
                </p>
              ) : (
                <div className="space-y-2">
                  {dependencies.map((dep) => (
                    <div
                      key={dep.code}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-raised/40 p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-primary">
                          {dep.code}
                        </span>
                        {dep.rule && (
                          <span className="text-xs text-text-secondary">
                            — {dep.rule.name} (Seq {dep.rule.sequence})
                          </span>
                        )}
                      </div>

                      {dep.isValid && dep.isSequenceValid ? (
                        <span className="inline-flex items-center gap-1 rounded bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                          <CheckCircle2 className="size-3" /> Valid (Seq {dep.rule?.sequence} &lt; {rule.sequence})
                        </span>
                      ) : !dep.isValid ? (
                        <span className="inline-flex items-center gap-1 rounded bg-danger/10 border border-danger/20 px-2 py-0.5 text-[10px] font-semibold text-danger">
                          <AlertTriangle className="size-3" /> Missing Rule
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                          <AlertTriangle className="size-3" /> Sequence Violation
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Structures referencing this rule */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold">
                Associated Salary Structures ({referencingStructures.length})
              </CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Salary structures that currently include this rule in their execution set.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {referencingStructures.length === 0 ? (
                <p className="p-4 text-xs text-text-muted">
                  This rule is currently unassigned to any salary structure. You can include it when creating or editing a structure.
                </p>
              ) : (
                <div className="space-y-3">
                  {referencingStructures.map((structure) => (
                    <Link
                      key={structure.id}
                      href={`/salary-structures/${structure.id}`}
                      className="block rounded-lg border border-border/60 bg-surface-raised/40 p-3.5 hover:border-primary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-text-primary">
                          {structure.name}
                        </p>
                        <StatusBadge status={structure.status.toLowerCase() as any} />
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Contains {structure.ruleIds?.length ?? 0} rules
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-text-secondary space-y-2 font-mono">
              <p>Rule: {rule.name}</p>
              <p>Code: {rule.code}</p>
              <p>Category: {CATEGORY_LABEL_MAP[rule.category as any] || rule.category}</p>
              <p>Sequence: {rule.sequence}</p>
              <p>Computation: {COMPUTATION_TYPE_LABEL_MAP[rule.computationType] || rule.computationType}</p>
              {rule.computationType === "FIXED" && <p>Amount: ₹{(rule.amount ?? 0).toLocaleString()}</p>}
              {rule.computationType === "PERCENTAGE" && <p>Rate: {rule.percentage}% of {(rule.basedOn || ["BASIC"]).join(", ")}</p>}
              {rule.computationType === "FORMULA" && <p>Expression: {rule.formula}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={confirmDelete}
        title="Delete Salary Rule?"
        message={`Are you sure you want to delete rule "${rule.name}" (${rule.code})? If any salary structures include this rule, deletion will be rejected to protect data integrity.`}
        confirmLabel="Delete Rule"
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        busy={deleteRule.isPending}
      />
    </>
  );
}
