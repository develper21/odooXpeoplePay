"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Users,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  LoaderCircle,
} from "lucide-react";
import {
  useSalaryStructures,
  useEmployees,
  useContracts,
  useCreatePayrun,
} from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/states";
import { findApplicableContract } from "@/lib/services/payroll-service";
import type { Employee } from "@/types/domain";

export default function NewPayrunWizardPage() {
  const router = useRouter();
  const { data: structures, isLoading: loadingStructures } =
    useSalaryStructures();
  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: contracts, isLoading: loadingContracts } = useContracts();
  const createPayrunMutation = useCreatePayrun();

  // Wizard Step State: 1 = Setup, 2 = Employee Selection
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 Fields
  const [name, setName] = useState("September 2026 Payroll");
  const [structureId, setStructureId] = useState("ss-001");
  const [period, setPeriod] = useState("September 2026");
  const [periodStart, setPeriodStart] = useState("2026-09-01");
  const [periodEnd, setPeriodEnd] = useState("2026-09-30");
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 Fields & Filtering
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Active Salary Structures
  const activeStructures = useMemo(() => {
    return (structures || []).filter((s) => s.status === "ACTIVE");
  }, [structures]);

  // Compute Employee Eligibility with Period-Specific Contracts
  const evaluatedEmployees = useMemo(() => {
    if (!employees || !contracts) return [];

    return employees.map((emp) => {
      // 1. Employee Active Status
      const isActive = emp.status === "ACTIVE";

      // 2. Applicable Contract Check using Period Dates
      const contractResolution = findApplicableContract(
        emp.id,
        periodStart,
        periodEnd,
        contracts,
      );

      const contract = contractResolution.contract;
      const hasActiveContract =
        contract !== undefined && contract.status === "ACTIVE";

      // 3. Banking details
      const hasBank = Boolean(
        emp.bankAccount && emp.bankAccount.trim().length > 0,
      );

      // Eligibility Status determination
      let eligibility: "ELIGIBLE" | "WARNING" | "INELIGIBLE" = "ELIGIBLE";
      let statusMessage = "Eligible for payroll";

      if (!isActive) {
        eligibility = "INELIGIBLE";
        statusMessage = `Employee is ${(emp.status || "inactive").toLowerCase()}`;
      } else if (!contract) {
        eligibility = "WARNING";
        statusMessage = "Missing Active Contract for Period";
      } else if (!hasActiveContract) {
        eligibility = "WARNING";
        statusMessage = "Contract Expired / Inactive";
      } else if (!hasBank) {
        eligibility = "WARNING";
        statusMessage = "Missing Bank Details";
      }

      return {
        employee: emp,
        contract,
        eligibility,
        statusMessage,
        hasBank,
      };
    });
  }, [employees, contracts, periodStart, periodEnd]);

  // Filtered employees for Step 2 table
  const displayedEmployees = useMemo(() => {
    return evaluatedEmployees.filter(({ employee: emp }) => {
      // Exclude completely inactive employees from wizard table
      if (emp.status === "INACTIVE") return false;

      const matchesSearch =
        `${emp.firstName} ${emp.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        emp.employeeNumber.toLowerCase().includes(search.toLowerCase()) ||
        emp.department.toLowerCase().includes(search.toLowerCase());

      const matchesDept = deptFilter === "ALL" || emp.department === deptFilter;
      const matchesType =
        typeFilter === "ALL" || emp.employeeType === typeFilter;

      return matchesSearch && matchesDept && matchesType;
    });
  }, [evaluatedEmployees, search, deptFilter, typeFilter]);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set((employees || []).map((e) => e.department));
    return Array.from(set).filter(Boolean);
  }, [employees]);

  // Handle Step 1 Validation & Progression
  const handleContinueToStep2 = () => {
    setStep1Error(null);
    if (!name.trim()) {
      setStep1Error("Payrun name is required.");
      return;
    }
    if (!structureId) {
      setStep1Error("Please select an active Salary Structure.");
      return;
    }
    if (!period.trim()) {
      setStep1Error("Period label is required (e.g. 'September 2026').");
      return;
    }
    if (!periodStart || !periodEnd) {
      setStep1Error("Period start and end dates are required.");
      return;
    }
    if (periodEnd < periodStart) {
      setStep1Error("Period end date cannot be earlier than start date.");
      return;
    }

    // Default select all eligible employees on first enter to step 2 if none selected
    if (selectedIds.length === 0) {
      const eligibleIds = evaluatedEmployees
        .filter((e) => e.eligibility !== "INELIGIBLE")
        .map((e) => e.employee.id);
      setSelectedIds(eligibleIds);
    }

    // IMPORTANT: Continue does NOT create payrun. Only changes wizard step!
    setStep(2);
  };

  // Select / Deselect Logic
  const handleSelectAllDisplayed = () => {
    const displayedIds = displayedEmployees.map((e) => e.employee.id);
    const combined = Array.from(new Set([...selectedIds, ...displayedIds]));
    setSelectedIds(combined);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const toggleEmployee = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Step 2 Submission: Creates the DRAFT Payrun
  const handleCreatePayrun = async () => {
    setCreationError(null);
    if (selectedIds.length === 0) {
      setCreationError(
        "Please select at least one employee to include in this payrun.",
      );
      return;
    }

    const ref = `PR-${period.replace(/\s+/g, "-").toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const created = await createPayrunMutation.mutateAsync({
        reference: ref,
        name,
        salaryStructureId: structureId,
        period,
        periodStart,
        periodEnd,
        employeeCount: selectedIds.length,
        selectedEmployeeIds: selectedIds,
        grossTotal: 0,
        deductionsTotal: 0,
        netTotal: 0,
        status: "DRAFT",
      } as any);

      // Navigate to Payrun Processing Workspace
      const targetId = created?.id || (created as any)?.payrun?.id;
      if (targetId) {
        router.push(`/payroll/${targetId}`);
      } else {
        router.push("/payroll");
      }
    } catch (err: any) {
      setCreationError(err.message || "Failed to create payrun cycle.");
    }
  };

  if (loadingStructures || loadingEmployees || loadingContracts) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/payroll"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Payroll Workflow
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Create Payrun Wizard
          </h1>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
              step === 1
                ? "bg-primary text-white"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            {step > 1 ? "✓" : "1"}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Step 1
            </p>
            <p className="text-sm font-bold text-foreground">
              Setup & Structure
            </p>
          </div>
        </div>

        <div className="h-0.5 flex-1 max-w-[120px] bg-border mx-4" />

        <div className="flex items-center gap-3">
          <span
            className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
              step === 2
                ? "bg-primary text-white"
                : "bg-surface-raised text-text-muted"
            }`}
          >
            2
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Step 2
            </p>
            <p className="text-sm font-bold text-foreground">
              Employee Selection
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: SETUP FORM */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Payrun Setup</h2>
            <p className="text-xs text-text-secondary">
              Define the salary structure and timeframe for this payroll cycle.
            </p>
          </div>

          {step1Error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" />
              <span>{step1Error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Payrun Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. September 2026 Regular Payroll"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Period Label *
              </label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. September 2026"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Salary Structure *
              </label>
              <select
                value={structureId}
                onChange={(e) => setStructureId(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {activeStructures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.ruleIds?.length ?? (s as any).rules?.length ?? 0} Rules)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Period Start *
                </label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Period End *
                </label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              onClick={handleContinueToStep2}
              className="gap-2"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: EMPLOYEE SELECTION */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xl space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Select Eligible Employees
              </h2>
              <p className="text-xs text-text-secondary">
                Only checked employees will be included in the payrun batch.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
                {selectedIds.length} Selected
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSelectAllDisplayed}
                className="text-xs"
              >
                <CheckSquare className="size-3.5 mr-1" /> Select Displayed
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          </div>

          {creationError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-danger">
              <AlertCircle className="size-4 shrink-0" />
              <span>{creationError}</span>
            </div>
          )}

          {/* Filtering row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-surface-raised/40 p-3 rounded-lg border border-border/60">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, ID or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-raised pl-9 pr-4 py-1.5 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="ALL">All Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
          </div>

          {/* Employee Selection Table */}
          <DataTable>
            <TableHeader>
              <tr>
                <TableCell className="w-12 text-center">Include</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position / Type</TableCell>
                <TableCell>Contract Status</TableCell>
                <TableCell>Eligibility / Attention</TableCell>
              </tr>
            </TableHeader>
            <tbody>
              {displayedEmployees.map(
                ({ employee: emp, contract, eligibility, statusMessage }) => {
                  const isSelected = selectedIds.includes(emp.id);

                  return (
                    <TableRow
                      key={emp.id}
                      className={isSelected ? "bg-surface-soft/60" : ""}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmployee(emp.id)}
                          className="size-4 rounded border-border bg-surface-raised text-primary focus:ring-primary cursor-pointer"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {emp.firstName} {emp.lastName}
                          </span>
                          <span className="text-[11px] font-mono text-text-muted">
                            {emp.employeeNumber}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        {emp.department}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span>{emp.position}</span>
                          <span className="text-[10px] text-text-muted uppercase">
                            {(emp.employeeType || "Full Time").replace(/_/g, " ")}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {contract ? (
                          <div className="flex flex-col text-xs">
                            <span className="font-medium text-foreground">
                              {contract.reference}
                            </span>
                            <span className="text-[11px] text-text-muted font-mono">
                              ₹{contract.monthlySalary.toLocaleString()}/mo
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-danger inline-flex items-center">
                            <AlertCircle className="size-3 mr-1" /> No Contract
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {eligibility === "ELIGIBLE" ? (
                          <span className="inline-flex items-center text-xs font-semibold text-green-400">
                            <CheckCircle2 className="size-3.5 mr-1 text-success" />{" "}
                            Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-warning">
                            <AlertTriangle className="size-3.5 mr-1 text-warning" />{" "}
                            {statusMessage}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </tbody>
          </DataTable>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
              className="gap-2"
            >
              <ArrowLeft className="size-4" /> Back to Setup
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={
                selectedIds.length === 0 || createPayrunMutation.isPending
              }
              onClick={handleCreatePayrun}
              className="gap-2"
            >
              {createPayrunMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Creating Payrun...
                </>
              ) : (
                <>Create Payrun ({selectedIds.length} Selected)</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
