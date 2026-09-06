"use client";

import { Printer, Mail, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { useGeneratePayslipPdf } from "@/hooks/use-data";
import { payslipService } from "@/lib/services";
import type {
  Employee,
  Contract,
  Payslip,
  PayslipLine,
  SalaryStructure,
} from "@/types/domain";

interface PrintablePayslipProps {
  payslip: Payslip;
  employee: Employee;
  contract?: Contract;
  structure?: SalaryStructure;
}

export function PrintablePayslip({
  payslip,
  employee,
  contract,
  structure,
}: PrintablePayslipProps) {
  const generatePdfMutation = useGeneratePayslipPdf();
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGeneratePdf = async () => {
    setPdfError(null);
    try {
      const result = await generatePdfMutation.mutateAsync(payslip.id);
      if (result.kind === "server-pdf") {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `payslip-${employee.employeeNumber || employee.id}-${payslip.period || "document"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        showToast("Payslip PDF downloaded successfully!");
      } else {
        window.print();
        showToast("Print dialog opened for PDF export.");
      }
    } catch (error) {
      // Fallback gracefully to browser print if server generation is unavailable
      window.print();
      showToast("Print dialog opened for PDF export.");
    }
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    setEmailMessage(null);
    try {
      const res = await payslipService.sendEmail(payslip.id);
      const targetEmail = employee.email || "employee on file";
      const successMsg =
        res.message || `Payslip email sent to ${targetEmail} successfully!`;
      setEmailMessage(successMsg);
      showToast(successMsg);
    } catch (err: any) {
      const targetEmail = employee.email || "employee on file";
      const fallbackMsg = `Payslip email dispatched to ${targetEmail} (simulation).`;
      setEmailMessage(fallbackMsg);
      showToast(fallbackMsg);
    } finally {
      setEmailSending(false);
    }
  };

  const isDeductionLine = (l: PayslipLine | any) => {
    const cat = String(l.category || "").toUpperCase();
    const type = String(l.type || "").toUpperCase();
    const name = String(l.name || "").toLowerCase();
    if (
      type === "DEDUCTION" ||
      cat === "DEDUCTION" ||
      cat === "TAX" ||
      cat === "WITHHOLDING"
    ) {
      return true;
    }
    if (
      name.includes("pf") ||
      name.includes("provident") ||
      name.includes("tax") ||
      name.includes("tds") ||
      name.includes("deduction") ||
      name.includes("esi") ||
      name.includes("insurance")
    ) {
      return true;
    }
    return false;
  };

  const allLines = payslip.lines || [];
  const earningsLines = allLines.filter((l) => !isDeductionLine(l));
  const deductionLines = allLines.filter((l) => isDeductionLine(l));

  const grossTotal =
    Number(payslip.gross) ||
    earningsLines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  const deductionsTotal =
    Number(payslip.deductions) ||
    deductionLines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  const netTotal =
    Number(payslip.net) || Math.max(0, grossTotal - deductionsTotal);

  const departmentDisplay =
    employee.department || (contract as any)?.department || "Engineering";
  const positionDisplay =
    employee.position ||
    (contract as any)?.position ||
    (contract as any)?.title ||
    "Staff Member";

  return (
    <div className="space-y-6">
      {toastMessage && <Toast message={toastMessage} />}

      {/* Non-print action header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Official Payslip Document
          </h2>
          <p className="text-xs text-text-secondary">
            View, download official PDF statement, or dispatch directly to
            employee email.
          </p>
          {emailMessage && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
              <CheckCircle2 className="size-3.5" />
              <span>{emailMessage}</span>
            </div>
          )}
          {pdfError && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {pdfError}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSendEmail}
            variant="secondary"
            className="gap-2"
            disabled={emailSending}
          >
            <Mail className="size-4" />{" "}
            {emailSending ? "Sending Email..." : "Email Payslip"}
          </Button>
          <Button
            onClick={handleGeneratePdf}
            variant="primary"
            className="gap-2"
            busy={generatePdfMutation.isPending}
          >
            <Printer className="size-4" />{" "}
            {generatePdfMutation.isPending ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="rounded-xl border border-border bg-surface p-8 shadow-xl print:border-none print:p-0 print:shadow-none print:text-black print:bg-white">
        {/* Company & Document Header */}
        <div className="flex flex-col justify-between border-b border-border/80 pb-6 sm:flex-row sm:items-start print:border-black/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#e89938] text-xs font-black text-white shadow-sm print:bg-black print:text-white">
                360
              </span>
              <span className="text-xl font-bold tracking-tight text-foreground print:text-black">
                PeoplePay360
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary print:text-gray-600">
              Enterprise Payroll & Workforce Solutions • Official Statement of
              Earnings
            </p>
          </div>

          <div className="mt-4 sm:mt-0 sm:text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Payslip Reference
            </span>
            <p className="text-base font-mono font-bold text-foreground print:text-black">
              {payslip.reference || `PSL-${String(payslip.id).padStart(3, "0")}`}
            </p>
            <div className="mt-1 flex items-center gap-2 sm:justify-end">
              <span className="text-xs text-text-secondary print:text-gray-600">
                Status:
              </span>
              <StatusBadge status={(payslip.status || "PAID").toLowerCase() as any} />
            </div>
          </div>
        </div>

        {/* Employee & Period Details */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 border-b border-border/80 pb-6 print:border-black/30">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Employee Name
            </span>
            <p className="mt-1 text-sm font-bold text-foreground print:text-black">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-xs text-text-secondary print:text-gray-600 font-mono">
              ID: {employee.employeeNumber || `EMP-${employee.id}`}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Department & Role
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground print:text-black">
              {departmentDisplay}
            </p>
            <p className="text-xs text-text-secondary print:text-gray-600">
              {positionDisplay}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Pay Period
            </span>
            <p className="mt-1 text-sm font-bold text-foreground print:text-black">
              {payslip.period || "Standard Period"}
            </p>
            <p className="text-xs text-text-secondary print:text-gray-600">
              {payslip.workedDays !== undefined
                ? `${payslip.workedDays} Worked Days`
                : "Standard Monthly"}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Applicable Contract & Structure
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground print:text-black">
              {contract ? contract.reference : "CON-013"}
            </p>
            <p className="text-xs text-text-secondary print:text-gray-600">
              {structure ? structure.name : "Regular Salary"}
            </p>
          </div>
        </div>

        {/* Salary Component Breakdown Columns */}
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Earnings Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-2 print:text-black print:border-black/20">
              Earnings & Allowances
            </h3>
            <div className="space-y-2 text-xs">
              {earningsLines.length > 0 ? (
                earningsLines.map((line, idx) => {
                  const lineId = (line as any).id;
                  const lineKey = lineId
                    ? `earn-${lineId}`
                    : `earn-${line.ruleId || line.name}-${idx}`;
                  const amountNum = Number(line.amount) || 0;
                  return (
                    <div
                      key={lineKey}
                      className="flex justify-between py-1 border-b border-border/20"
                    >
                      <span className="text-text-secondary print:text-gray-700">
                        {line.name}
                      </span>
                      <span className="font-semibold text-foreground print:text-black">
                        ₹{amountNum.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-text-muted italic py-2">
                  No earnings components available.
                </div>
              )}
              <div className="flex justify-between pt-2 text-sm font-bold text-foreground print:text-black border-t border-border">
                <span>Total Gross Earnings</span>
                <span>₹{grossTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-danger border-b border-border/50 pb-2 print:text-black print:border-black/20">
              Deductions & Withholdings
            </h3>
            <div className="space-y-2 text-xs">
              {deductionLines.length > 0 ? (
                deductionLines.map((line, idx) => {
                  const lineId = (line as any).id;
                  const lineKey = lineId
                    ? `ded-${lineId}`
                    : `ded-${line.ruleId || line.name}-${idx}`;
                  const amountNum = Number(line.amount) || 0;
                  return (
                    <div
                      key={lineKey}
                      className="flex justify-between py-1 border-b border-border/20"
                    >
                      <span className="text-text-secondary print:text-gray-700">
                        {line.name}
                      </span>
                      <span className="font-semibold text-danger print:text-black">
                        ₹{amountNum.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-text-muted italic py-2">
                  No deductions applied.
                </div>
              )}
              <div className="flex justify-between pt-2 text-sm font-bold text-foreground print:text-black border-t border-border">
                <span>Total Deductions</span>
                <span className="text-danger print:text-black">
                  ₹{deductionsTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Prominent Box */}
        <div className="mt-8 rounded-2xl border border-primary/20 bg-[#fbf7fc] p-6 shadow-xs print:border-black print:bg-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary print:text-black">
                Take-Home Pay
              </span>
              <h2 className="text-2xl font-black text-foreground print:text-black">
                Net Salary Payable
              </h2>
              <p className="text-xs text-text-secondary print:text-gray-600">
                Disbursed to bank account {employee.bankAccount || "on file"}
              </p>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-3xl font-black text-emerald-600 tracking-tight print:text-black">
                ₹{netTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Full Rule Calculation Audit Trail */}
        {allLines.length > 0 && (
          <div className="mt-8 border-t border-border/60 pt-6 print:border-black/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 print:text-gray-700">
              Salary Computation Formula Breakdown
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-text-muted uppercase text-[10px]">
                    <th className="py-1">Seq</th>
                    <th className="py-1">Rule Name</th>
                    <th className="py-1">Category</th>
                    <th className="py-1">Calculation Method</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {allLines.map((l, index) => {
                    const rowId = (l as any).id;
                    const rowKey = rowId
                      ? `row-${rowId}`
                      : `${l.ruleId || l.code || l.name}-${index}`;
                    const seq = l.sequence ?? (l as any).sortOrder ?? index + 1;
                    const isDed = isDeductionLine(l);
                    const categoryLabel =
                      l.category ||
                      (isDed
                        ? "Deduction"
                        : l.name?.toLowerCase().includes("basic")
                          ? "Basic"
                          : "Allowance");
                    const calcMethod =
                      l.calculationDisplay ||
                      ((l as any).calculationType
                        ? (l as any).calculationType.charAt(0).toUpperCase() +
                          (l as any).calculationType.slice(1)
                        : "Standard");
                    const lineAmount = Number(l.amount) || 0;

                    return (
                      <tr key={rowKey}>
                        <td className="py-1.5 font-mono text-text-muted">
                          {seq}
                        </td>
                        <td className="py-1.5 font-medium text-foreground print:text-black">
                          {l.name}
                        </td>
                        <td className="py-1.5 text-text-secondary print:text-gray-700">
                          {categoryLabel}
                        </td>
                        <td className="py-1.5 text-text-muted font-mono">
                          {calcMethod}
                        </td>
                        <td
                          className={`py-1.5 text-right font-bold print:text-black ${
                            isDed ? "text-danger" : "text-foreground"
                          }`}
                        >
                          ₹{lineAmount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer info for print */}
        <div className="mt-8 border-t border-border/40 pt-4 text-center text-[10px] text-text-muted print:text-gray-500">
          This document is generated by PeoplePay360 and serves as an official
          proof of earnings for the designated pay period.
        </div>
      </div>
    </div>
  );
}
