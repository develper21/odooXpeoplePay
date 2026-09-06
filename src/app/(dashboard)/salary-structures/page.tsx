"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Search,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useContracts,
  useDeleteSalaryStructure,
  useSalaryRules,
  useSalaryStructures,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
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

export default function SalaryStructuresPage() {
  const { data: structures = [], isLoading, isError } = useSalaryStructures();
  const { data: rules = [] } = useSalaryRules();
  const { data: contracts = [] } = useContracts();
  const { user } = useAuth();
  const deleteStructure = useDeleteSalaryStructure();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = Boolean(
    user && canAccess(user.role, "salary_structure.create"),
  );
  const canEdit = Boolean(
    user && canAccess(user.role, "salary_structure.update"),
  );
  const canDelete = Boolean(
    user && canAccess(user.role, "salary_structure.delete"),
  );

  // Compute employee count per structure
  const structureContractCounts = useMemo(() => {
    const map = new Map<string, number>();
    contracts.forEach((c) => {
      if (c.salaryStructureId) {
        map.set(c.salaryStructureId, (map.get(c.salaryStructureId) || 0) + 1);
      }
    });
    return map;
  }, [contracts]);

  const filteredStructures = useMemo(() => {
    return structures.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [structures, search, statusFilter]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteError(null);
    try {
      await deleteStructure.mutateAsync(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete structure.");
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError)
    return <ErrorState message="Unable to load salary structures." />;

  const structureToDelete = structures.find((s) => s.id === deletingId);

  return (
    <>
      <PageHeader
        title="Salary Structures"
        description="Organize, order, and govern compensation packages and rule execution sequence for workforce payroll."
        action={
          canCreate
            ? { label: "New Salary Structure", href: "/salary-structures/new" }
            : undefined
        }
      />

      <SalaryTabs />

      {/* Filter / Search Bar */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by structure name or description..."
              className="h-10 w-full rounded-md border border-border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

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

          {(search || statusFilter !== "ALL") && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
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

      {/* Table */}
      {filteredStructures.length === 0 ? (
        <EmptyState
          title="No salary structures found"
          message={
            search || statusFilter !== "ALL"
              ? "No salary structures match your search criteria. Try resetting filters."
              : "No salary structures configured yet. Create one to organize payroll rules."
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Name & Description</TableCell>
              <TableCell className="text-center">Rules</TableCell>
              <TableCell className="text-center">Assigned Employees</TableCell>
              <TableCell>Status</TableCell>
              <TableCell className="text-right">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filteredStructures.map((structure) => {
              const ruleCount = structure.ruleIds?.length ?? 0;
              const assignedCount =
                structureContractCounts.get(structure.id) ?? 0;

              return (
                <TableRow key={structure.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/salary-structures/${structure.id}`}
                        className="font-semibold text-text-primary hover:text-primary transition-colors"
                      >
                        {structure.name}
                      </Link>
                      {structure.description && (
                        <p className="mt-0.5 max-w-md text-xs text-text-muted truncate">
                          {structure.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-surface-raised border border-border/60 px-2 py-0.5 text-xs font-mono font-medium text-text-secondary">
                      {ruleCount} {ruleCount === 1 ? "rule" : "rules"}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                      {assignedCount}{" "}
                      {assignedCount === 1 ? "employee" : "employees"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <StatusBadge
                      status={structure.status}
                    />
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/salary-structures/${structure.id}`}
                        className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
                        title="View Structure"
                      >
                        <Eye className="size-4" />
                      </Link>

                      {canEdit && (
                        <Link
                          href={`/salary-structures/${structure.id}/edit`}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-text-primary transition-colors"
                          title="Edit Structure"
                        >
                          <Edit3 className="size-4" />
                        </Link>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingId(structure.id);
                          }}
                          className="rounded p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                          title="Delete Structure"
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
        title="Delete Salary Structure?"
        message={`Are you sure you want to delete "${structureToDelete?.name}"? Structures referenced by active employment contracts cannot be removed.`}
        confirmLabel="Delete Structure"
        onCancel={() => {
          setDeletingId(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        busy={deleteStructure.isPending}
      />
    </>
  );
}
