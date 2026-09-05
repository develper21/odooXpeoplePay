"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Eye, AlertTriangle } from "lucide-react";
import { usePayruns, useSalaryStructures, usePayslips } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, TableHeader, TableRow, TableCell } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/metric-card";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import type { PayrunStatus } from "@/types/domain";

export default function PayrollPage() {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const canCreate = canAccess(role, "payrun.create");

  const { data: payruns, isLoading, error } = usePayruns();
  const { data: structures } = useSalaryStructures();
  const { data: payslips } = usePayslips();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [structureFilter, setStructureFilter] = useState<string>("ALL");

  const structureMap = useMemo(() => {
    return new Map((structures || []).map((s) => [s.id, s.name]));
  }, [structures]);

  const filteredPayruns = useMemo(() => {
    if (!payruns) return [];

    return payruns.filter((p) => {
      const matchesSearch =
        (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
        (p.reference && p.reference.toLowerCase().includes(search.toLowerCase())) ||
        (p.period && p.period.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchesStructure =
        structureFilter === "ALL" || p.salaryStructureId === structureFilter;

      return matchesSearch && matchesStatus && matchesStructure;
    });
  }, [payruns, search, statusFilter, structureFilter]);

  // Derive Summary Metrics from Payruns & Payslips
  const totalPayruns = payruns?.length || 0;
  const draftPayruns = (payruns || []).filter((p) => p.status === "DRAFT").length;
  const activePayruns = (payruns || []).filter((p) => p.status === "COMPUTED" || p.status === "VALIDATED").length;
  const paidPayruns = (payruns || []).filter((p) => p.status === "PAID").length;

  const totalDisbursed = (payruns || [])
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + (p.netTotal || 0), 0);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load payrun records. Please refresh the page." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll & Payruns"
        description="Oversee company pay cycles, calculate salary rules, and validate disbursements."
        action={
          canCreate
            ? {
                label: "New Payrun",
                href: "/payroll/new",
              }
            : undefined
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          metric={{
            label: "Total Cycles",
            value: String(totalPayruns),
            change: `${paidPayruns} paid`,
            trend: "up",
            tone: "blue",
          }}
        />
        <MetricCard
          metric={{
            label: "In Processing",
            value: String(activePayruns),
            change: "Active batch",
            trend: "up",
            tone: "amber",
          }}
        />
        <MetricCard
          metric={{
            label: "Drafts",
            value: String(draftPayruns),
            change: "Setup stage",
            trend: "down",
            tone: "violet",
          }}
        />
        <MetricCard
          metric={{
            label: "Paid Net Total",
            value: `₹${totalDisbursed.toLocaleString()}`,
            change: "Cumulative",
            trend: "up",
            tone: "green",
          }}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by payrun name, period or ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-raised pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Filter className="size-3.5" /> Status:
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="COMPUTED">Computed</option>
              <option value="VALIDATED">Validated</option>
              <option value="PAID">Paid (Historical)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            Structure:
            <select
              value={structureFilter}
              onChange={(e) => setStructureFilter(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Structures</option>
              {(structures || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payruns List Table */}
      {filteredPayruns.length === 0 ? (
        <EmptyState
          title="No payruns found"
          message={
            search || statusFilter !== "ALL" || structureFilter !== "ALL"
              ? "Try adjusting your search query or filters to find payrun records."
              : "No payrun batches have been created yet. Launch a new cycle using the New Payrun button."
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <tr>
              <TableCell>Payrun</TableCell>
              <TableCell>Salary Structure</TableCell>
              <TableCell>Period</TableCell>
              <TableCell className="text-center">Employees</TableCell>
              <TableCell className="text-right">Total Gross</TableCell>
              <TableCell className="text-right">Total Net</TableCell>
              <TableCell className="text-center">Status</TableCell>
              <TableCell>Validation / Warnings</TableCell>
              <TableCell className="text-right">Action</TableCell>
            </tr>
          </TableHeader>
          <tbody>
            {filteredPayruns.map((payrun) => {
              const structureName = payrun.salaryStructureId
                ? structureMap.get(payrun.salaryStructureId) || "Standard"
                : "Regular Salary";

              const warningCount = payrun.warnings?.length || 0;
              const hasError = payrun.warnings?.some((w) => w.severity === "ERROR");

              return (
                <TableRow key={payrun.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {payrun.name || payrun.reference}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        {payrun.reference}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-text-secondary font-medium">
                    {structureName}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold">{payrun.period}</span>
                      {payrun.periodStart && payrun.periodEnd && (
                        <span className="text-[11px] text-text-muted">
                          {payrun.periodStart} → {payrun.periodEnd}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center font-medium">
                    {payrun.employeeCount}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {payrun.grossTotal > 0 ? `₹${payrun.grossTotal.toLocaleString()}` : "—"}
                  </TableCell>

                  <TableCell className="text-right font-bold text-success">
                    {payrun.netTotal > 0 ? `₹${payrun.netTotal.toLocaleString()}` : "—"}
                  </TableCell>

                  <TableCell className="text-center">
                    <StatusBadge status={payrun.status.toLowerCase() as any} />
                  </TableCell>

                  <TableCell>
                    {warningCount > 0 ? (
                      <div className="flex items-center gap-1 text-xs">
                        <AlertTriangle className="size-3.5 text-warning" />
                        <span className={hasError ? "text-danger font-medium" : "text-warning font-medium"}>
                          {warningCount} issue{warningCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    ) : payrun.status === "DRAFT" ? (
                      <span className="text-xs text-text-muted">Not computed</span>
                    ) : (
                      <span className="text-xs text-green-400">✓ Verified</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`/payroll/${payrun.id}`}
                      className="inline-flex items-center gap-1 rounded bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft hover:underline"
                    >
                      <Eye className="size-3.5" /> View
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
