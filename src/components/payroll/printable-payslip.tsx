"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { useGeneratePayslipPdf } from "@/hooks/use-data";
import type { Employee, Contract, Payslip, SalaryStructure } from "@/types/domain";

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

  const handleGeneratePdf = async () => {
    setPdfError(null);
    try {
      const result = await generatePdfMutation.mutateAsync(payslip.id);
      if (result.kind === "server-pdf") {
        const url = URL.createObjectURL(result.blob);
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        window.print();
      }
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "PDF generation failed. Please try again.");
    }
  };

  const basicRules = (payslip.lines || []).filter((l) => l.category === "BASIC");
  const allowanceRules = (payslip.lines || []).filter((l) => l.category === "ALLOWANCE");
  const deductionRules = (payslip.lines || []).filter((l) => l.category === "DEDUCTION");
  const grossRules = (payslip.lines || []).filter((l) => l.category === "GROSS");
  const netRules = (payslip.lines || []).filter((l) => l.category === "NET");

  return (
    <div className="space-y-6">
      {/* Non-print action header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold">Official Payslip Document</h2>
          <p className="text-xs text-text-secondary">
            Mock mode uses the printable browser fallback; API mode opens the generated PDF response.
          </p>
          {pdfError && <p className="mt-2 text-xs text-danger" role="alert">{pdfError}</p>}
        </div>
        <Button onClick={handleGeneratePdf} variant="primary" className="gap-2" busy={generatePdfMutation.isPending}>
          <Printer className="size-4" /> {generatePdfMutation.isPending ? "Generating..." : "Generate PDF"}
        </Button>
      </div>

      {/* Printable Sheet Container */}
      <div className="rounded-xl border border-border bg-surface p-8 shadow-xl print:border-none print:p-0 print:shadow-none print:text-black print:bg-white">
        {/* Company & Document Header */}
        <div className="flex flex-col justify-between border-b border-border/80 pb-6 sm:flex-row sm:items-start print:border-black/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-white print:bg-black print:text-white">
                360
              </span>
              <span className="text-xl font-bold tracking-tight text-foreground print:text-black">
                PeoplePay360
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary print:text-gray-600">
              Enterprise Payroll & Workforce Solutions • Official Statement of Earnings
            </p>
          </div>

          <div className="mt-4 sm:mt-0 sm:text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Payslip Reference
            </span>
            <p className="text-base font-mono font-bold text-foreground print:text-black">
              {payslip.reference}
            </p>
            <div className="mt-1 flex items-center gap-2 sm:justify-end">
              <span className="text-xs text-text-secondary print:text-gray-600">Status:</span>
              <StatusBadge status={payslip.status.toLowerCase() as any} />
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
              ID: {employee.employeeNumber}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Department & Role
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground print:text-black">
              {employee.department}
            </p>
            <p className="text-xs text-text-secondary print:text-gray-600">
              {employee.position}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Pay Period
            </span>
            <p className="mt-1 text-sm font-bold text-foreground print:text-black">
              {payslip.period}
            </p>
            <p className="text-xs text-text-secondary print:text-gray-600">
              {payslip.workedDays !== undefined ? `${payslip.workedDays} Worked Days` : "Standard Period"}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted print:text-gray-500">
              Applicable Contract & Structure
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground print:text-black">
              {contract ? contract.reference : "Standard Contract"}
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
              {basicRules.map((line) => (
                <div key={line.ruleId} className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-text-secondary print:text-gray-700">{line.name}</span>
                  <span className="font-semibold text-foreground print:text-black">₹{line.amount.toLocaleString()}</span>
                </div>
              ))}
              {allowanceRules.map((line) => (
                <div key={line.ruleId} className="flex justify-between py-1 border-b border-border/20">
                  <span className="text-text-secondary print:text-gray-700">{line.name}</span>
                  <span className="font-semibold text-foreground print:text-black">₹{line.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm font-bold text-foreground print:text-black border-t border-border">
                <span>Total Gross Earnings</span>
                <span>₹{payslip.gross.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-danger border-b border-border/50 pb-2 print:text-black print:border-black/20">
              Deductions & Withholdings
            </h3>
            <div className="space-y-2 text-xs">
              {deductionRules.length > 0 ? (
                deductionRules.map((line) => (
                  <div key={line.ruleId} className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-text-secondary print:text-gray-700">{line.name}</span>
                    <span className="font-semibold text-danger print:text-black">₹{line.amount.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-text-muted italic py-2">No deductions applied.</div>
              )}
              <div className="flex justify-between pt-2 text-sm font-bold text-foreground print:text-black border-t border-border">
                <span>Total Deductions</span>
                <span className="text-danger print:text-black">₹{(payslip.deductions || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Prominent Box */}
        <div className="mt-8 rounded-xl border border-primary/40 bg-surface-raised/90 p-6 print:border-black print:bg-gray-100">
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
              <span className="text-3xl font-black text-success tracking-tight print:text-black">
                ₹{payslip.net.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Full Rule Calculation Audit Trail */}
        {payslip.lines && payslip.lines.length > 0 && (
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
                  {payslip.lines.map((l) => (
                    <tr key={l.ruleId}>
                      <td className="py-1.5 font-mono text-text-muted">{l.sequence}</td>
                      <td className="py-1.5 font-medium text-foreground print:text-black">{l.name}</td>
                      <td className="py-1.5 text-text-secondary print:text-gray-700">{l.category}</td>
                      <td className="py-1.5 text-text-muted font-mono">{l.calculationDisplay || "Standard"}</td>
                      <td className="py-1.5 text-right font-bold text-foreground print:text-black">₹{l.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer info for print */}
        <div className="mt-8 border-t border-border/40 pt-4 text-center text-[10px] text-text-muted print:text-gray-500">
          This document is generated by PeoplePay360 and serves as an official proof of earnings for the designated pay period.
        </div>
      </div>
    </div>
  );
}
