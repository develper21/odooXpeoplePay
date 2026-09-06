import type { PayrunWarning } from "@/types/domain";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

export function PayrunWarningsAlert({
  warnings,
  onSelectEmployee,
}: {
  warnings?: PayrunWarning[];
  onSelectEmployee?: (employeeId: string) => void;
}) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-400">
        <CheckCircle2 className="size-4 shrink-0 text-success" />
        <div>
          <span className="font-semibold">No payroll issues detected</span> —
          All selected employees have active contracts, valid banking, and
          consistent payslip profiles.
        </div>
      </div>
    );
  }

  const errors = warnings.filter((w) => w.severity === "ERROR");
  const warnList = warnings.filter((w) => w.severity === "WARNING");
  const infoList = warnings.filter((w) => w.severity === "INFO");

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-500/30 bg-surface-raised/90 p-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Payroll Warnings & Validation Issues
              </h3>
              <p className="text-xs text-text-secondary">
                {warnings.length}{" "}
                {warnings.length === 1 ? "issue requires" : "issues require"}{" "}
                review before payroll finalization.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            {errors.length > 0 && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-red-400 border border-red-500/20">
                {errors.length} Blocking Error{errors.length > 1 ? "s" : ""}
              </span>
            )}
            {warnList.length > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-amber-400 border border-amber-500/20">
                {warnList.length} Warning{warnList.length > 1 ? "s" : ""}
              </span>
            )}
            {infoList.length > 0 && (
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-blue-400 border border-blue-500/20">
                {infoList.length} Notice{infoList.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 divide-y divide-border/40">
          {warnings.map((w) => (
            <div
              key={w.id}
              className="flex items-start justify-between py-2.5 text-xs transition-colors hover:bg-surface-soft/40 px-2 rounded"
            >
              <div className="flex items-start gap-2.5">
                {w.severity === "ERROR" ? (
                  <AlertCircle className="size-4 shrink-0 text-danger mt-0.5" />
                ) : w.severity === "WARNING" ? (
                  <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
                ) : (
                  <Info className="size-4 shrink-0 text-primary mt-0.5" />
                )}
                <div>
                  {w.employeeName && (
                    <span className="font-semibold text-foreground mr-1.5">
                      {w.employeeName}:
                    </span>
                  )}
                  <span className="text-text-secondary">{w.message}</span>
                </div>
              </div>

              {w.employeeId && onSelectEmployee && (
                <button
                  type="button"
                  onClick={() => onSelectEmployee(w.employeeId!)}
                  className="shrink-0 ml-3 text-[11px] font-semibold text-primary hover:underline"
                >
                  View Details
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
