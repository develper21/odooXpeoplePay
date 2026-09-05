import type { TimeOffAllocation, TimeOffRequest, TimeOffType, TimeOffUnit } from "@/types/domain";

export function calculateRequestDuration(startDate: string, endDate: string, unit: TimeOffUnit = "DAYS"): number {
  if (!startDate || !endDate) return 0;
  const [y1, m1, d1] = startDate.split("-").map(Number);
  const [y2, m2, d2] = endDate.split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  if (utc2 < utc1) return 0;
  
  const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24)) + 1;
  if (unit === "HOURS") {
    return diffDays * 8;
  }
  return Math.max(1, diffDays);
}

export function isAllocationAvailable(allocation: TimeOffAllocation): boolean {
  return allocation.status === "APPROVED" || allocation.status === "ACTIVE";
}

export function usableAllocationRemaining(allocation: TimeOffAllocation): number {
  return isAllocationAvailable(allocation) ? allocation.remainingDays : 0;
}

export function calculateAllocationRemaining(allocatedDays: number, usedDays: number): number {
  return Math.max(0, allocatedDays - usedDays);
}

export function findApplicableAllocation(
  allocations: TimeOffAllocation[],
  employeeId: string,
  typeIdOrName: string,
  startDate?: string
): TimeOffAllocation | undefined {
  const matches = allocations.filter(
    (alloc) =>
      alloc.employeeId === employeeId &&
      isAllocationAvailable(alloc) &&
      (alloc.typeId === typeIdOrName || alloc.type.toLowerCase() === typeIdOrName.toLowerCase())
  );

  if (matches.length === 0) return undefined;

  if (startDate) {
    const validMatch = matches.find((alloc) => {
      if (!alloc.validFrom || !alloc.validTo) return true;
      return startDate >= alloc.validFrom && startDate <= alloc.validTo;
    });
    if (validMatch) return validMatch;
  }

  return matches[0];
}

export function canApproveTimeOffRequest(
  request: TimeOffRequest,
  allocation?: TimeOffAllocation,
  type?: TimeOffType
): { canApprove: boolean; reason?: string } {
  if (request.status !== "PENDING") {
    return { canApprove: false, reason: `Request is already ${request.status.toLowerCase()}` };
  }

  const requiresAllocation = type ? type.allocationRequired : Boolean(allocation);

  if (requiresAllocation) {
    if (!allocation) {
      return {
        canApprove: false,
        reason: "No active leave allocation found for this employee to deduct balance from.",
      };
    }
    if (allocation.remainingDays < request.days) {
      return {
        canApprove: false,
        reason: `Insufficient balance. Remaining: ${allocation.remainingDays} days, Requested: ${request.days} days`,
      };
    }
  }

  return { canApprove: true };
}

export function formatTimeOffDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
