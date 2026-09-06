"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import {
  usePayslip,
  usePayrun,
  useEmployees,
  useContracts,
  useSalaryStructures,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PrintablePayslip } from "@/components/payroll/printable-payslip";
import type { Employee } from "@/types/domain";

export default function PayslipDetailsPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const userEmpId = user?.employeeId;

  const {
    data: payslip,
    isLoading: loadingSlip,
    error: slipError,
  } = usePayslip(id);
  const { data: employees } = useEmployees();
  const { data: contracts } = useContracts();
  const { data: structures } = useSalaryStructures();

  const employee = useMemo(() => {
    if (!payslip) return undefined;
    if (employees && employees.length > 0) {
      const found = employees.find(
        (e) =>
          String(e.id) === String(payslip.employeeId) ||
          e.employeeNumber === (payslip as any).employeeCode,
      );
      if (found) return found;
    }
    if ((payslip as any).employeeFirstName || (payslip as any).employeeLastName) {
      return {
        id: payslip.employeeId,
        firstName: (payslip as any).employeeFirstName || "Employee",
        lastName: (payslip as any).employeeLastName || "",
        employeeNumber:
          (payslip as any).employeeCode || `EMP-${payslip.employeeId}`,
        email: (payslip as any).employeeEmail || "",
        department: "Engineering",
        position: "Software Engineer",
        status: "ACTIVE",
      } as unknown as Employee;
    }
    return undefined;
  }, [payslip, employees]);

  const contract = useMemo(() => {
    if (!payslip || !contracts) return undefined;
    if (payslip.contractId) {
      return contracts.find((c) => String(c.id) === String(payslip.contractId));
    }
    return contracts.find(
      (c) =>
        String(c.employeeId) === String(payslip.employeeId) &&
        c.status === "ACTIVE",
    );
  }, [payslip, contracts]);

  const structure = useMemo(() => {
    if (!payslip || !structures) return undefined;
    return structures.find(
      (s) => String(s.id) === String(payslip.salaryStructureId),
    );
  }, [payslip, structures]);

  if (loadingSlip) return <LoadingState />;
  if (slipError || !payslip || !employee) {
    return (
      <ErrorState message="Payslip record not found or could not be loaded." />
    );
  }

  // RBAC: An employee cannot view another employee's payslip
  if (role === "EMPLOYEE" && userEmpId && payslip.employeeId !== userEmpId) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-3">
        <AlertTriangle className="size-8 text-danger mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          You do not have permission to view other employees&apos; payslips. You
          can only view and print your own individual salary statements.
        </p>
        <Link
          href="/payslips"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Return to My Payslips
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-3 print:hidden">
        <Link
          href={payslip.payrunId ? `/payroll/${payslip.payrunId}` : "/payslips"}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="text-xs text-text-muted">
          Back to {payslip.payrunId ? "Payrun Processing" : "Payslips"}
        </span>
      </div>

      {/* Printable Payslip Component */}
      <PrintablePayslip
        payslip={payslip}
        employee={employee}
        contract={contract}
        structure={structure}
      />
    </div>
  );
}
