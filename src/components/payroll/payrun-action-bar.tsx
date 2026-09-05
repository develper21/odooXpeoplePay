"use client";

import { Button } from "@/components/ui/button";
import { Calculator, CheckCheck, Send, DollarSign, LoaderCircle } from "lucide-react";
import type { Payrun, PayrunStatus } from "@/types/domain";

interface PayrunActionBarProps {
  payrun: Payrun;
  canCompute: boolean;
  canValidate: boolean;
  canMarkPaid: boolean;
  canSend: boolean;
  onCompute: () => void;
  onValidate: () => void;
  onMarkPaid: () => void;
  onSendPayslips: () => void;
  isComputing?: boolean;
  isValidating?: boolean;
  isMarkingPaid?: boolean;
  isSending?: boolean;
}

export function PayrunActionBar({
  payrun,
  canCompute,
  canValidate,
  canMarkPaid,
  canSend,
  onCompute,
  onValidate,
  onMarkPaid,
  onSendPayslips,
  isComputing,
  isValidating,
  isMarkingPaid,
  isSending,
}: PayrunActionBarProps) {
  const status = payrun.status;
  const hasBlockingErrors = (payrun.warnings || []).some((w) => w.severity === "ERROR" || w.blocking);

  // Workflow Progression Rules
  // DRAFT -> Compute available
  // COMPUTED -> Validate available (blocked if blocking error exists), Compute can re-compute
  // VALIDATED -> Mark Paid available
  // PAID -> No mark paid, Send payslips available
  const isDraft = status === "DRAFT";
  const isComputed = status === "COMPUTED" || status === "WARNING" || status === "PENDING_APPROVAL";
  const isValidated = status === "VALIDATED";
  const isPaid = status === "PAID";

  const computeDisabled = !canCompute || isPaid || isComputing;
  const validateDisabled = !canValidate || (!isComputed && !isValidated) || isPaid || hasBlockingErrors || isValidating;
  const markPaidDisabled = !canMarkPaid || !isValidated || isPaid || isMarkingPaid;
  const sendDisabled = !canSend || !isPaid || isSending;

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-surface-raised/70 p-2.5">
      {/* 1. Compute Button */}
      <Button
        type="button"
        variant={isDraft ? "primary" : "secondary"}
        size="sm"
        disabled={computeDisabled}
        onClick={onCompute}
        title={!canCompute ? "Insufficient permissions" : isPaid ? "Payrun is already paid" : "Calculate salary rules for selected employees"}
        className="text-xs"
      >
        {isComputing ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
            Computing...
          </>
        ) : (
          <>
            <Calculator className="size-3.5 mr-1.5" />
            {isComputed ? "Re-Compute" : "Compute"}
          </>
        )}
      </Button>

      {/* 2. Validate Button */}
      <Button
        type="button"
        variant={isComputed && !hasBlockingErrors ? "primary" : "secondary"}
        size="sm"
        disabled={validateDisabled}
        onClick={onValidate}
        title={
          !canValidate
            ? "Insufficient permissions"
            : hasBlockingErrors
            ? "Resolve blocking errors before validation"
            : !isComputed
            ? "Compute payrun before validating"
            : "Lock and validate payrun calculations"
        }
        className="text-xs"
      >
        {isValidating ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
            Validating...
          </>
        ) : (
          <>
            <CheckCheck className="size-3.5 mr-1.5" />
            Validate
          </>
        )}
      </Button>

      {/* 3. Mark Paid Button */}
      <Button
        type="button"
        variant={isValidated ? "primary" : "secondary"}
        size="sm"
        disabled={markPaidDisabled}
        onClick={onMarkPaid}
        title={
          !canMarkPaid
            ? "Insufficient permissions"
            : !isValidated
            ? "Payrun must be VALIDATED before marking as paid"
            : isPaid
            ? "Payrun has already been paid"
            : "Finalize and mark payment as dispatched"
        }
        className="text-xs"
      >
        {isMarkingPaid ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
            Finalizing...
          </>
        ) : (
          <>
            <DollarSign className="size-3.5 mr-1.5" />
            Mark Paid
          </>
        )}
      </Button>

      {/* 4. Send Payslips Button */}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={sendDisabled}
        onClick={onSendPayslips}
        title={!canSend ? "Insufficient permissions" : !isPaid ? "Mark the payrun as paid before sending payslips" : "Send payslips via email to employees"}
        className="text-xs ml-auto"
      >
        {isSending ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
            Dispatching...
          </>
        ) : (
          <>
            <Send className="size-3.5 mr-1.5" />
            Send Payslips
          </>
        )}
      </Button>
    </div>
  );
}
