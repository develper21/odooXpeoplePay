"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Users,
  DollarSign,
  AlertTriangle,
  Send,
  Printer,
  CheckCircle2,
} from "lucide-react";
import {
  usePayrun,
  usePayslips,
  useEmployees,
  useContracts,
  useSalaryStructures,
  useComputePayrun,
  useValidatePayrun,
  useMarkPayrunPaid,
  useSendPayslips,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PayrunActionBar } from "@/components/payroll/payrun-action-bar";
import { PayrunWarningsAlert } from "@/components/payroll/payrun-warnings-alert";
import { PayrunEmployeeTable } from "@/components/payroll/payrun-employee-table";

export default function PayrunDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";

  // Permissions
  const canCompute = canAccess(role, "payrun.compute");
  const canValidate = canAccess(role, "payrun.validate");
  const canMarkPaid = canAccess(role, "payrun.mark_paid");
  const canSend = canAccess(role, "payslip.send");

  // Data Queries
  const {
    data: payrun,
    isLoading: loadingPayrun,
    error: payrunError,
  } = usePayrun(id);
  const { data: allPayslips, isLoading: loadingPayslips } = usePayslips();
  const { data: employees } = useEmployees();
  const { data: contracts } = useContracts();
  const { data: structures } = useSalaryStructures();

  // Mutations
  const computeMutation = useComputePayrun();
  const validateMutation = useValidatePayrun();
  const markPaidMutation = useMarkPayrunPaid();
  const sendPayslipsMutation = useSendPayslips();

  // Local State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [sendSummary, setSendSummary] = useState<{
    sentCount: number;
    failedCount: number;
    failures: { employeeName: string; reason: string }[];
    simulated?: boolean;
  } | null>(null);

  // Payslips belonging to this payrun
  const payrunPayslips = useMemo(() => {
    return (allPayslips || []).filter((p) => p.payrunId === id);
  }, [allPayslips, id]);

  const structureName = useMemo(() => {
    if (!payrun?.salaryStructureId || !structures) return "Regular Salary";
    const s = structures.find((item) => item.id === payrun.salaryStructureId);
    return s ? s.name : "Regular Salary";
  }, [payrun, structures]);

  // Derived Totals
  const isComputed = payrun?.status !== "DRAFT";
  const totalEmployees = payrun?.employeeCount || payrunPayslips.length || 0;
  const totalGross = isComputed
    ? (Number(payrun?.grossTotal) ||
      payrunPayslips.reduce((s, p) => s + (Number(p.gross) || 0), 0))
    : 0;
  const totalDeductions = isComputed
    ? (Number(payrun?.deductionsTotal) ||
      payrunPayslips.reduce((s, p) => s + (Number(p.deductions) || 0), 0))
    : 0;
  const totalNet = isComputed
    ? (Number(payrun?.netTotal) || payrunPayslips.reduce((s, p) => s + (Number(p.net) || 0), 0))
    : 0;

  // Actions
  const handleCompute = async () => {
    setErrorMessage(null);
    setToastMessage(null);
    try {
      await computeMutation.mutateAsync(id);
      setToastMessage("Payrun computed successfully. Salary rules evaluated.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to compute payrun.");
    }
  };

  const handleValidate = async () => {
    setErrorMessage(null);
    setToastMessage(null);
    try {
      await validateMutation.mutateAsync(id);
      setToastMessage(
        "Payrun validated successfully. Calculations are locked.",
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to validate payrun.");
    }
  };

  const handleConfirmMarkPaid = async () => {
    setErrorMessage(null);
    setToastMessage(null);
    try {
      await markPaidMutation.mutateAsync(id);
      setShowMarkPaidDialog(false);
      setToastMessage("Payrun marked as paid! Payment records finalized.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to finalize payment.");
    }
  };

  const handleSendPayslips = async () => {
    setErrorMessage(null);
    setToastMessage(null);
    setSendSummary(null);
    try {
      const res: any = await sendPayslipsMutation.mutateAsync(id);
      if (res) {
        setSendSummary(res);
        setToastMessage(`${res.sentCount} payslip(s) dispatched successfully.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to dispatch payslips.");
    }
  };

  if (loadingPayrun || loadingPayslips) return <LoadingState />;
  if (payrunError || !payrun) {
    return (
      <ErrorState message="Payrun cycle not found or access is restricted." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} />}

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/payroll"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-secondary hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {payrun.name || payrun.reference}
              </h1>
              <StatusBadge status={payrun.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1">
              <span className="font-mono">{payrun.reference}</span>
              <span>•</span>
              <span>{structureName}</span>
              <span>•</span>
              <span>{payrun.period}</span>
              {payrun.periodStart && payrun.periodEnd && (
                <span className="font-mono text-text-muted">
                  ({payrun.periodStart} → {payrun.periodEnd})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <PayrunActionBar
          payrun={payrun}
          canCompute={canCompute}
          canValidate={canValidate}
          canMarkPaid={canMarkPaid}
          canSend={canSend}
          onCompute={handleCompute}
          onValidate={handleValidate}
          onMarkPaid={() => setShowMarkPaidDialog(true)}
          onSendPayslips={handleSendPayslips}
          isComputing={computeMutation.isPending}
          isValidating={validateMutation.isPending}
          isMarkingPaid={markPaidMutation.isPending}
          isSending={sendPayslipsMutation.isPending}
        />
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-danger shadow-lg">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4" /> Operation Blocked
          </div>
          <p className="mt-1 whitespace-pre-line leading-relaxed">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Mock Delivery Summary Banner */}
      {sendSummary && (
        <div className="rounded-lg border border-border bg-surface-raised p-4 text-xs shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Send className="size-4 text-primary" /> Payslip Delivery Summary
          </div>
          <p className="mt-1 text-text-secondary">
            {sendSummary.simulated && (
              <span className="mr-1 text-warning">
                Mock delivery simulation:
              </span>
            )}
            Dispatched{" "}
            <strong className="text-foreground">{sendSummary.sentCount}</strong>{" "}
            payslip(s) successfully.
            {sendSummary.failedCount > 0 && (
              <span className="text-danger ml-1">
                ({sendSummary.failedCount} failed due to missing email address)
              </span>
            )}
          </p>
          {sendSummary.failures.length > 0 && (
            <div className="mt-2 space-y-1 rounded border border-border/60 bg-surface p-2 text-[11px] text-text-secondary">
              {sendSummary.failures.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-danger">
                  <span>
                    • {f.employeeName}: {f.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings & Attention Alert Section */}
      <PayrunWarningsAlert warnings={payrun.warnings} />

      {/* Financial Metrics Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          metric={{
            label: "Target Employees",
            value: String(totalEmployees),
            change: `${payrunPayslips.length} payslips`,
            trend: "up",
            tone: "blue",
          }}
        />
        <MetricCard
          metric={{
            label: "Gross Salary",
            value: isComputed
              ? `₹${totalGross.toLocaleString()}`
              : "Not Computed",
            change: "Earnings",
            trend: "up",
            tone: "violet",
          }}
        />
        <MetricCard
          metric={{
            label: "Deductions",
            value: isComputed
              ? `₹${totalDeductions.toLocaleString()}`
              : "Not Computed",
            change: "Withholdings",
            trend: "down",
            tone: "amber",
          }}
        />
        <MetricCard
          metric={{
            label: "Net Payable",
            value: isComputed
              ? `₹${totalNet.toLocaleString()}`
              : "Not Computed",
            change: "Disbursement",
            trend: "up",
            tone: "green",
          }}
        />
        <MetricCard
          metric={{
            label: "Workflow Status",
            value: payrun.status,
            change: payrun.paidAt ? "Disbursed" : "In Progress",
            trend: "up",
            tone: "blue",
          }}
        />
      </div>

      {/* Employee Payslips Table Section */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Employee Breakdown & Generated Payslips
            </h2>
            <p className="text-xs text-text-secondary">
              Click any employee row to open the complete salary calculation and
              printable payslip statement.
            </p>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {payrunPayslips.length} Payslip
            {payrunPayslips.length === 1 ? "" : "s"}
          </span>
        </div>

        <PayrunEmployeeTable
          payslips={payrunPayslips}
          employees={employees || []}
          contracts={contracts || []}
          selectedPayrunStatus={payrun.status}
        />
      </div>

      {/* Mark Paid Confirmation Dialog */}
      <ConfirmationDialog
        open={showMarkPaidDialog}
        title="Finalize & Mark Payrun as Paid"
        message={`Are you sure you want to mark the '${payrun.name || payrun.reference}' payrun as PAID? This will lock all employee payslips and record the official payment disbursement timestamp. This operation cannot be reversed.`}
        confirmLabel="Confirm Payment"
        onConfirm={handleConfirmMarkPaid}
        onCancel={() => setShowMarkPaidDialog(false)}
        busy={markPaidMutation.isPending}
      />
    </div>
  );
}
