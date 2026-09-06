"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useTimeOffTypes } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
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
import { Card } from "@/components/ui/card";
import { TimeOffTabs } from "@/components/time-off/time-off-tabs";

export default function TimeOffTypesPage() {
  const { data: types = [], isLoading, isError } = useTimeOffTypes();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return types.filter((type) => {
      const matchSearch = type.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchUnit = unitFilter === "ALL" || type.unit === unitFilter;
      return matchSearch && matchUnit;
    });
  }, [types, search, unitFilter]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Leave types could not be loaded." />;

  const canManage = Boolean(user && canAccess(user.role, "timeoff.approve"));

  return (
    <>
      <PageHeader
        title="Time Off Types"
        description="Configure leave policies, units, allocation, and approval requirements."
        action={
          canManage
            ? { label: "New Leave Type", href: "/time-off/types/new" }
            : undefined
        }
      />

      <TimeOffTabs />

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leave types..."
              className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary"
          >
            <option value="ALL">All Units</option>
            <option value="DAYS">Days</option>
            <option value="HOURS">Hours</option>
          </select>
          <button
            onClick={() => {
              setSearch("");
              setUnitFilter("ALL");
            }}
            className="h-10 rounded-md px-3 text-xs text-text-secondary hover:bg-surface-raised"
          >
            Reset
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No leave types found"
          message="Try adjusting your search filter or create a new type."
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Allocation Required</TableCell>
              <TableCell>Approval Required</TableCell>
              <TableCell>Payroll Integration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filtered.map((type) => (
              <TableRow key={type.id}>
                <TableCell>
                  <Link
                    href={`/time-off/types/${type.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    {type.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-text-secondary">
                  {type.unit}
                </TableCell>
                <TableCell className="text-xs">
                  {type.allocationRequired ? "Yes" : "No"}
                </TableCell>
                <TableCell className="text-xs">
                  {type.approvalRequired ? "Yes" : "No"}
                </TableCell>
                <TableCell className="text-xs">
                  {type.payrollIntegration ? "Yes" : "No"}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={type.status.toLowerCase() as "active" | "inactive"}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/time-off/types/${type.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
