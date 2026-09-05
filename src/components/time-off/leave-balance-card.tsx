import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatTimeOffDate } from "@/lib/time-off-utils";
import type { TimeOffAllocation } from "@/types/domain";

export function LeaveBalanceCard({ allocation }: { allocation: TimeOffAllocation }) {
  const percentage = allocation.allocatedDays > 0 
    ? Math.min(100, Math.round((allocation.usedDays / allocation.allocatedDays) * 100))
    : 0;

  const unitLabel = allocation.unit === "HOURS" ? "hours" : "days";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">{allocation.type}</h3>
          <p className="mt-1 text-xs text-text-muted">
            Valid {formatTimeOffDate(allocation.validFrom)} → {formatTimeOffDate(allocation.validTo)}
          </p>
        </div>
        <StatusBadge status={allocation.status.toLowerCase() as "active" | "expired" | "draft" | "inactive"} />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold text-text-primary">{allocation.remainingDays}</span>
          <span className="ml-1 text-xs text-text-muted">{unitLabel} remaining</span>
        </div>
        <span className="text-xs text-text-secondary">
          Used {allocation.usedDays} / {allocation.allocatedDays} {unitLabel}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Card>
  );
}
