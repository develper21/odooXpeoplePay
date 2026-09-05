import Link from "next/link";
import { DataTable, TableHeader, TableRow, TableCell } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/states";
import type { Employee, Contract, Payslip } from "@/types/domain";
import { AlertCircle, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";

interface PayrunEmployeeTableProps {
  payslips: Payslip[];
  employees: Employee[];
  contracts: Contract[];
  selectedPayrunStatus: string;
}

export function PayrunEmployeeTable({
  payslips,
  employees,
  contracts,
  selectedPayrunStatus,
}: PayrunEmployeeTableProps) {
  if (payslips.length === 0) {
    return (
      <EmptyState
        title="No payslips generated yet"
        message="Click the 'Compute' action above to calculate salary rules and generate employee payslips."
      />
    );
  }

  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const contractMap = new Map(contracts.map((c) => [c.id, c]));

  return (
    <DataTable>
      <TableHeader>
        <tr>
          <TableCell className="w-12">#</TableCell>
          <TableCell>Employee</TableCell>
          <TableCell>Department / Position</TableCell>
          <TableCell>Applicable Contract</TableCell>
          <TableCell className="text-center">Worked Days</TableCell>
          <TableCell className="text-right">Gross</TableCell>
          <TableCell className="text-right">Deductions</TableCell>
          <TableCell className="text-right">Net</TableCell>
          <TableCell className="text-center">Status</TableCell>
          <TableCell>Attention / Warnings</TableCell>
          <TableCell className="text-right">Action</TableCell>
        </tr>
      </TableHeader>
      <tbody>
        {payslips.map((slip, idx) => {
          const emp = employeeMap.get(slip.employeeId);
          const contract = slip.contractId ? contractMap.get(slip.contractId) : undefined;
          const fullName = emp ? `${emp.firstName} ${emp.lastName}` : `Employee ${slip.employeeId}`;
          const warningCount = slip.warnings?.length || 0;
          const hasError = slip.warnings?.some((w) => w.severity === "ERROR");

          return (
            <TableRow key={slip.id}>
              <TableCell className="text-text-muted text-xs font-mono">{idx + 1}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{fullName}</span>
                  <span className="text-[11px] text-text-muted font-mono">{emp?.employeeNumber || slip.employeeId}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-xs">
                  <span>{emp?.department || "—"}</span>
                  <span className="text-text-muted">{emp?.position || "—"}</span>
                </div>
              </TableCell>
              <TableCell>
                {contract ? (
                  <div className="flex flex-col text-xs">
                    <span className="font-medium text-text-secondary">{contract.reference}</span>
                    <span className="text-[11px] text-text-muted">₹{contract.monthlySalary.toLocaleString()}/mo</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center text-xs text-danger">
                    <AlertCircle className="size-3 mr-1" /> Missing Contract
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center font-medium">
                {slip.workedDays !== undefined ? `${slip.workedDays} d` : "—"}
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
              <TableCell>
                {warningCount > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {hasError ? (
                      <span className="flex items-center text-danger">
                        <AlertCircle className="size-3.5 mr-1 shrink-0" />
                        {slip.warnings![0].message}
                      </span>
                    ) : (
                      <span className="flex items-center text-warning">
                        <AlertTriangle className="size-3.5 mr-1 shrink-0" />
                        {slip.warnings![0].message}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-text-muted">Clean</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/payslips/${slip.id}`}
                  className="inline-flex items-center gap-1 rounded bg-surface-raised px-2.5 py-1 text-xs font-semibold text-primary hover:bg-surface-soft hover:underline"
                >
                  View <ExternalLink className="size-3" />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </tbody>
    </DataTable>
  );
}
