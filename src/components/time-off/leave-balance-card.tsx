import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatTimeOffDate } from "@/lib/time-off-utils";
import type { TimeOffAllocation } from "@/types/domain";
import { Clock, AlertCircle } from "lucide-react";

export function LeaveBalanceCard({ allocation }: { allocation: TimeOffAllocation }) {
  const isPending = allocation.status === "PENDING";
  const isRefused = allocation.status === "REFUSED";
  const isAvailable = allocation.status === "APPROVED" || allocation.status === "ACTIVE";

  const unitLabel = allocation.unit === "HOURS" ? "hours" : "days";

  const percentage = isAvailable && allocation.allocatedDays > 0
    ? Math.min(100, Math.round((allocation.usedDays / allocation.allocatedDays) * 100))
    : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{allocation.type}</h3>
          <p className="mt-1 text-xs text-text-muted">
            Valid {formatTimeOffDate(allocation.validFrom)} → {formatTimeOffDate(allocation.validTo)}
          </p>
        </div>
        <StatusBadge
          status={
            allocation.status.toLowerCase() as
              | "active"
              | "expired"
              | "draft"
              | "inactive"
              | "pending"
              | "approved"
              | "refused"
          }
        />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div>
          {isPending ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-400">0</span>
                <span className="text-xs font-semibold text-amber-400">usable {unitLabel}</span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-400/90">
                <Clock className="size-3" />
                {allocation.allocatedDays} {unitLabel} pending approval
              </p>
            </div>
          ) : isRefused ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-red-400">0</span>
                <span className="text-xs font-semibold text-red-400">usable {unitLabel}</span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-red-400/90">
                <AlertCircle className="size-3" />
                Quota refused by management
              </p>
            </div>
          ) : (
            <div>
              <span className="text-2xl font-bold text-text-primary">{allocation.remainingDays}</span>
              <span className="ml-1 text-xs text-text-muted">{unitLabel} remaining</span>
            </div>
          )}
        </div>

        <span className="text-xs text-text-secondary">
          {isAvailable ? (
            `Used ${allocation.usedDays} / ${allocation.allocatedDays} ${unitLabel}`
          ) : (
            `Total Quota: ${allocation.allocatedDays} ${unitLabel}`
          )}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isPending
              ? "bg-amber-500/50"
              : isRefused
              ? "bg-red-500/50"
              : "bg-primary"
          }`}
          style={{ width: isPending ? "100%" : `${percentage}%` }}
        />
      </div>
    </Card>
  );
}
