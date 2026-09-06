"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit3,
  Layers,
  Trash2,
  Users,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useContracts,
  useDeleteSalaryStructure,
  useEmployees,
  useSalaryRules,
  useSalaryStructure,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { sortRulesBySequence } from "@/lib/salary-calculator";
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
import { SalaryCalculationPreview } from "@/components/salary/salary-calculation-preview";
import { SalaryTabs } from "@/components/salary/salary-tabs";
import { employeeName } from "@/lib/hr-utils";

export default function SalaryStructureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: structure, isLoading, isError } = useSalaryStructure(id);
  const { data: allRules = [] } = useSalaryRules();
  const { data: contracts = [] } = useContracts();
  const { data: employees = [] } = useEmployees();

  const deleteStructure = useDeleteSalaryStructure();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = Boolean(
    user && canAccess(user.role, "salary_structure.update"),
  );
  const canDelete = Boolean(
    user && canAccess(user.role, "salary_structure.delete"),
  );

  // Ordered rules for this structure
  const orderedRules = useMemo(() => {
    if (!structure) return [];
    const ruleMap = new Map(allRules.map((r) => [r.id, r]));
    const rawIds: string[] = structure.ruleIds || (structure as any).rules?.map((r: any) => String(r.id || r)) || [];
    const list = rawIds
      .map((rId) => ruleMap.get(rId))
      .filter((r): r is (typeof allRules)[0] => Boolean(r));
    return sortRulesBySequence(list);
  }, [structure, allRules]);

  // Contracts assigned to this structure
  const assignedContracts = useMemo(() => {
    return contracts.filter((c) => c.salaryStructureId === id);
  }, [contracts, id]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((e) => [e.id, e]));
  }, [employees]);

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteStructure.mutateAsync(id);
      router.push("/salary-structures");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete salary structure.");
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError || !structure) {
    return (
      <ErrorState message="Salary structure was not found or has been deleted." />
    );
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/salary-structures"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Salary Structures
        </Link>
      </div>

      <PageHeader
        title={structure.name}
        description={
          structure.description ||
          "Configured salary structure and execution sequence."
        }
        action={
          canEdit
            ? { label: "Edit Structure", href: `/salary-structures/${id}/edit` }
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

      {/* Overview Metadata Bar */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted">Status</p>
          <div className="mt-2">
            <StatusBadge status={structure.status} />
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-text-muted">Execution Rules</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">
            {orderedRules.length}
          </p>
          <p className="text-[11px] text-text-muted">Ordered by sequence</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-text-muted">Assigned Contracts</p>
          <p className="mt-1 font-mono text-xl font-bold text-primary">
            {assignedContracts.length}
          </p>
          <p className="text-[11px] text-text-muted">
            Workforce members linked
          </p>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-text-muted">Currency</p>
            <p className="mt-1 font-mono text-lg font-bold text-text-secondary">
              {structure.currency || "INR"} (₹)
            </p>
          </div>
          {canDelete && (
            <div className="pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs"
              >
                <Trash2 className="size-3.5 mr-1" /> Delete Structure
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        {/* Ordered Salary Rules Table */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Rule Execution Sequence ({orderedRules.length})
                </CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  Rules execute deterministically from lowest to highest
                  sequence. Dependent formulas reference earlier sequence
                  outputs.
                </p>
              </div>
              <span className="rounded bg-surface-raised border border-border/60 px-2.5 py-1 text-xs font-mono text-text-secondary">
                Execution Order: Ascending
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {orderedRules.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                No salary rules are included in this structure. Edit the
                structure to add rules.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/60 bg-surface-raised text-[11px] font-semibold text-text-muted">
                    <tr>
                      <th className="px-3 py-2.5">Seq</th>
                      <th className="px-3 py-2.5">Rule Name</th>
                      <th className="px-3 py-2.5">Code</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Computation</th>
                      <th className="px-3 py-2.5">
                        Configuration / Expression
                      </th>
                      <th className="px-3 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {orderedRules.map((rule, idx) => {
                      return (
                        <tr
                          key={rule.id}
                          className="hover:bg-surface-raised/40 transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono text-[11px]">
                            <span className="inline-flex items-center justify-center rounded bg-surface-raised border border-border/60 px-2 py-0.5 font-bold text-primary">
                              {rule.sequence}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/salary-rules/${rule.id}`}
                              className="font-semibold text-text-primary hover:text-primary transition-colors"
                            >
                              {rule.name}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                            {rule.code}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded bg-surface-raised border border-border/40 px-2 py-0.5 text-[10px] font-semibold">
                              {CATEGORY_LABEL_MAP[rule.category as any] ||
                                rule.category}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-text-secondary">
                            {COMPUTATION_TYPE_LABEL_MAP[rule.computationType] ||
                              rule.computationType}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-text-muted">
                            {rule.computationType === "FIXED" &&
                              `₹${(rule.amount ?? 0).toLocaleString()}`}
                            {rule.computationType === "PERCENTAGE" &&
                              `${rule.percentage}% of ${(rule.basedOn || ["BASIC"]).join(" + ")}`}
                            {rule.computationType === "FORMULA" && (
                              <span className="text-emerald-400 font-semibold">
                                {rule.formula}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <StatusBadge
                              status={rule.status}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Calculation Preview */}
        <SalaryCalculationPreview
          rules={orderedRules}
          title={`Calculation Preview: ${structure.name}`}
          description="Live calculation simulation evaluating the ordered salary rules above."
        />

        {/* Assigned Workforce / Contracts Section */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Assigned Contracts & Workforce ({assignedContracts.length})
                </CardTitle>
                <p className="mt-1 text-xs text-text-muted">
                  Employees whose active employment contract utilizes this
                  salary structure for pay calculations.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {assignedContracts.length === 0 ? (
              <p className="p-4 text-xs text-text-muted">
                No active employment contracts are currently assigned to this
                salary structure.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assignedContracts.map((contract) => {
                  const emp = employeeMap.get(contract.employeeId);
                  return (
                    <div
                      key={contract.id}
                      className="rounded-lg border border-border/60 bg-surface-raised/40 p-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/contracts/${contract.id}`}
                            className="font-mono text-xs font-semibold text-primary hover:underline"
                          >
                            {contract.reference}
                          </Link>
                          <StatusBadge
                            status={contract.status}
                          />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-text-primary">
                          {employeeName(emp)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {contract.position} · {contract.department}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                        <span className="text-text-muted">Wage:</span>
                        <span className="font-mono font-semibold text-text-primary">
                          ${contract.monthlySalary.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDelete}
        title="Delete Salary Structure?"
        message={`Are you sure you want to delete "${structure.name}"? If any employment contracts are linked, deletion will be safely rejected.`}
        confirmLabel="Delete Structure"
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        busy={deleteStructure.isPending}
      />
    </>
  );
}
