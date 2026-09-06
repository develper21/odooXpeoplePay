"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Search,
  Eye,
  Edit3,
  Trash2,
  Plus,
  LockKeyhole,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useDeleteSalaryRule,
  useSalaryRules,
  useSalaryStructures,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { sortRulesBySequence } from "@/lib/salary-calculator";
import {
  CATEGORY_LABEL_MAP,
  COMPUTATION_TYPE_LABEL_MAP,
  SALARY_RULE_CATEGORIES,
} from "@/lib/salary-constants";
import { PageHeader } from "@/components/shared/page-header";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "@/components/shared/states";
import {
  DataTable,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { SalaryTabs } from "@/components/salary/salary-tabs";

export default function SalaryRulesPage() {
  const { data: rules = [], isLoading, isError } = useSalaryRules();
  const { data: structures = [] } = useSalaryStructures();
  const { user } = useAuth();
  const deleteRule = useDeleteSalaryRule();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = Boolean(user && canAccess(user.role, "salary_rule.create"));
  const canEdit = Boolean(user && canAccess(user.role, "salary_rule.update"));
  const canDelete = Boolean(user && canAccess(user.role, "salary_rule.delete"));

  const sortedRules = useMemo(() => sortRulesBySequence(rules), [rules]);

  const filteredRules = useMemo(() => {
    return sortedRules.filter((rule) => {
      const matchSearch =
        rule.name.toLowerCase().includes(search.toLowerCase()) ||
        rule.code.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === "ALL" || rule.category === categoryFilter;
      const matchType =
        typeFilter === "ALL" || rule.computationType === typeFilter;
      const matchStatus =
        statusFilter === "ALL" || rule.status === statusFilter;
      return matchSearch && matchCategory && matchType && matchStatus;
    });
  }, [sortedRules, search, categoryFilter, typeFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteError(null);
    try {
      await deleteRule.mutateAsync(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete salary rule.");
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Unable to load salary rules." />;

  const ruleToDelete = rules.find((r) => r.id === deletingId);

  return (
    <>
      <PageHeader
        title="Salary Rules"
        description="Define and govern individual earnings, allowances, statutory deductions, and calculation expressions."
        action={
          canCreate
            ? { label: "New Salary Rule", href: "/salary-rules/new" }
            : undefined
        }
      />

      <SalaryTabs />

      {/* Filter / Search Bar */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by rule name or code (e.g. BASIC, HRA)..."
              className="h-10 w-full rounded-md border border-border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {SALARY_RULE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Computation Types</option>
            <option value="FIXED">Fixed Amount</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FORMULA">Formula</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DRAFT">Draft</option>
          </select>

          {(search ||
            categoryFilter !== "ALL" ||
            typeFilter !== "ALL" ||
            statusFilter !== "ALL") && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setCategoryFilter("ALL");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="h-10 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {deleteError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Rules Table */}
      {filteredRules.length === 0 ? (
        <EmptyState
          title="No salary rules found"
          message={
            search || categoryFilter !== "ALL" || typeFilter !== "ALL"
              ? "No salary rules match the selected filters. Try resetting filters."
              : "No salary rules configured yet. Create a rule to start building salary structures."
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell className="w-16">Seq</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Computation</TableCell>
              <TableCell>Value / Expression</TableCell>
              <TableCell>Status</TableCell>
              <TableCell className="text-right">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filteredRules.map((rule) => {
              const isBasic = rule.category === "BASIC";
              const isAllowance = rule.category === "ALLOWANCE";
              const isDeduction = rule.category === "DEDUCTION";

              return (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono text-xs text-text-muted">
                    <span className="inline-flex items-center justify-center rounded bg-surface-raised border border-border/60 px-2 py-0.5 font-bold text-text-secondary">
                      {rule.sequence}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/salary-rules/${rule.id}`}
                      className="font-semibold text-text-primary hover:text-primary transition-colors"
                    >
                      {rule.name}
                    </Link>
                  </TableCell>

                  <TableCell className="font-mono font-bold text-primary text-xs">
                    {rule.code}
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isBasic
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          : isAllowance
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : isDeduction
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                      }`}
                    >
                      {CATEGORY_LABEL_MAP[rule.category] ||
                        rule.category ||
                        ((rule as any).type === "deduction"
                          ? "Deduction"
                          : "Allowance")}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-text-secondary">
                    {COMPUTATION_TYPE_LABEL_MAP[rule.computationType] ||
                      rule.computationType ||
                      (rule.percentage ? "Percentage" : "Fixed Amount")}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-text-muted max-w-xs truncate">
                    {rule.computationType === "PERCENTAGE" ||
                    (rule.percentage && Number(rule.percentage) > 0) ? (
                      <span>
                        {Number(rule.percentage || 0)}% of{" "}
                        {(rule.basedOn && rule.basedOn.length > 0
                          ? rule.basedOn
                          : ["BASIC"]
                        ).join(" + ")}
                      </span>
                    ) : rule.computationType === "FORMULA" || rule.formula ? (
                      <span className="text-emerald-600 font-semibold">
                        {rule.formula}
                      </span>
                    ) : (
                      <span>
                        ₹{(Number(rule.amount) || 0).toLocaleString("en-IN")}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={rule.status} />
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/salary-rules/${rule.id}`}
                        className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
                        title="View Rule Details"
                      >
                        <Eye className="size-4" />
                      </Link>

                      {canEdit && (
                        <Link
                          href={`/salary-rules/${rule.id}/edit`}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
                          title="Edit Rule"
                        >
                          <Edit3 className="size-4" />
                        </Link>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingId(rule.id);
                          }}
                          className="rounded p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={Boolean(deletingId)}
        title="Delete Salary Rule?"
        message={`Are you sure you want to delete rule "${ruleToDelete?.name}" (${ruleToDelete?.code})? If any salary structures contain this rule, deletion will be rejected.`}
        confirmLabel="Delete Rule"
        onCancel={() => {
          setDeletingId(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        busy={deleteRule.isPending}
      />
    </>
  );
}
