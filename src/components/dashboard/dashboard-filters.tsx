"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardFilters } from "@/types/domain";

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (nextFilters: DashboardFilters) => void;
  availablePeriods: string[];
  availableDepartments: string[];
}

export function DashboardFiltersBar({
  filters,
  onChange,
  availablePeriods,
  availableDepartments,
}: DashboardFiltersBarProps) {
  const currentPeriod = filters.period || "September 2026";
  const currentDepartment = filters.department || "ALL";
  const currentEmployeeType = filters.employeeType || "ALL";

  const isFiltered =
    currentPeriod !== "September 2026" ||
    currentDepartment !== "ALL" ||
    currentEmployeeType !== "ALL";

  const handleReset = () => {
    onChange({
      period: "September 2026",
      department: "ALL",
      employeeType: "ALL",
    });
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-surface/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <SlidersHorizontal className="size-3.5 text-primary" />
          <span>Filters:</span>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="dashboard-period" className="text-xs text-text-muted">
            Period:
          </label>
          <select
            id="dashboard-period"
            value={currentPeriod}
            onChange={(e) => onChange({ ...filters, period: e.target.value })}
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Periods</option>
            {availablePeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="dashboard-dept" className="text-xs text-text-muted">
            Department:
          </label>
          <select
            id="dashboard-dept"
            value={currentDepartment}
            onChange={(e) =>
              onChange({ ...filters, department: e.target.value })
            }
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Departments</option>
            {availableDepartments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Type Filter */}
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="dashboard-emp-type"
            className="text-xs text-text-muted"
          >
            Type:
          </label>
          <select
            id="dashboard-emp-type"
            value={currentEmployeeType}
            onChange={(e) =>
              onChange({ ...filters, employeeType: e.target.value })
            }
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Employment Types</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isFiltered && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Filtered View
          </span>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleReset}
          disabled={!isFiltered}
          className="h-8 gap-1.5 text-xs"
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}
