"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter, Eye, ExternalLink, Printer } from "lucide-react";
import { usePayslips, usePayruns, useEmployees, useContracts } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, TableHeader, TableRow, TableCell } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import type { PayslipStatus } from "@/types/domain";

export default function PayslipsPage() {
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const isEmployeeRole = role === "EMPLOYEE";
  const userEmpId = user?.employeeId;

  const { data: payslips, isLoading, error } = usePayslips();
  const { data: payruns } = usePayruns();
  const { data: employees } = useEmployees();
  const { data: contracts } = useContracts();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [payrunFilter, setPayrunFilter] = useState<string>("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>(
    isEmployeeRole && userEmpId ? userEmpId : "ALL"
  );

  const employeeMap = useMemo(() => {
    return new Map((employees || []).map((e) => [e.id, e]));
  }, [employees]);

  const payrunMap = useMemo(() => {
    return new Map((payruns || []).map((p) => [p.id, p]));
  }, [payruns]);

  const contractMap = useMemo(() => {
    return new Map((contracts || []).map((c) => [c.id, c]));
  }, [contracts]);

  const filteredPayslips = useMemo(() => {
    if (!payslips) return [];

    return payslips.filter((slip) => {
      // RBAC: EMPLOYEE can only see their own payslips
      if (isEmployeeRole && userEmpId && slip.employeeId !== userEmpId) {
        return false;
      }

      const emp = employeeMap.get(slip.employeeId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : "";
      const empNumber = emp?.employeeNumber || "";

      const matchesSearch =
        slip.reference.toLowerCase().includes(search.toLowerCase()) ||
        empName.toLowerCase().includes(search.toLowerCase()) ||
        empNumber.toLowerCase().includes(search.toLowerCase()) ||
        (slip.period && slip.period.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || slip.status === statusFilter;
      const matchesPayrun = payrunFilter === "ALL" || slip.payrunId === payrunFilter;
      const matchesEmployee =
        employeeFilter === "ALL" || slip.employeeId === employeeFilter;

      return matchesSearch && matchesStatus && matchesPayrun && matchesEmployee;
    });
  }, [
    payslips,
    search,
    statusFilter,
    payrunFilter,
    employeeFilter,
    isEmployeeRole,
    userEmpId,
    employeeMap,
  ]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load payslip records." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEmployeeRole ? "My Payslips" : "Employee Payslips"}
        description={
          isEmployeeRole
            ? "View and print your individual monthly salary statements."
            : "Audit salary breakdowns, gross, deductions, and payment status across all employees."
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by payslip ref, employee, or period..."
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
              <option value="PAID">Paid</option>
              <option value="SENT">Sent</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            Payrun:
            <select
              value={payrunFilter}
              onChange={(e) => setPayrunFilter(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary max-w-[160px] truncate"
            >
              <option value="ALL">All Payruns</option>
              {(payruns || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.period}
                </option>
              ))}
            </select>
          </div>

          {!isEmployeeRole && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              Employee:
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary max-w-[160px] truncate"
              >
                <option value="ALL">All Employees</option>
                {(employees || []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Payslips Table */}
      {filteredPayslips.length === 0 ? (
        <EmptyState
          title="No payslips found"
          message={
            search || statusFilter !== "ALL" || payrunFilter !== "ALL"
              ? "Try adjusting your filters or search keywords."
              : "No employee payslips are available for the selected view."
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <tr>
              <TableCell>Payslip Ref</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Payrun / Period</TableCell>
              <TableCell className="text-center">Worked Days</TableCell>
              <TableCell className="text-right">Gross</TableCell>
              <TableCell className="text-right">Deductions</TableCell>
              <TableCell className="text-right">Net Salary</TableCell>
              <TableCell className="text-center">Status</TableCell>
              <TableCell className="text-right">Action</TableCell>
            </tr>
          </TableHeader>
          <tbody>
            {filteredPayslips.map((slip) => {
              const emp = employeeMap.get(slip.employeeId);
              const payrun = payrunMap.get(slip.payrunId);
              const fullName = emp ? `${emp.firstName} ${emp.lastName}` : `EMP ${slip.employeeId}`;

              return (
                <TableRow key={slip.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-foreground text-xs">
                        {slip.reference}
                      </span>
                      {slip.sentAt && (
                        <span className="text-[10px] text-green-400">
                          Dispatched {new Date(slip.sentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{fullName}</span>
                      <span className="text-[11px] text-text-muted">
                        {emp?.department} • {emp?.position}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-medium text-foreground">
                        {slip.period || payrun?.period || "—"}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {payrun?.name || payrun?.reference}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center font-medium">
                    {slip.workedDays !== undefined ? `${slip.workedDays} d` : "22 d"}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    ₹{slip.gross ? slip.gross.toLocaleString() : "0"}
                  </TableCell>

                  <TableCell className="text-right text-text-secondary">
                    ₹{slip.deductions ? slip.deductions.toLocaleString() : "0"}
                  </TableCell>

                  <TableCell className="text-right font-bold text-success">
                    ₹{slip.net ? slip.net.toLocaleString() : "0"}
                  </TableCell>

                  <TableCell className="text-center">
                    <StatusBadge status={slip.status.toLowerCase() as any} />
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`/payslips/${slip.id}`}
                      className="inline-flex items-center gap-1 rounded bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-surface-soft hover:underline"
                    >
                      <Eye className="size-3.5" /> View / Print
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
