import type { Payrun } from "@/types/domain";
export const mockPayruns: Payrun[] = [
  { id: "pr-2026-08", reference: "PR-2026-08", period: "August 2026", employeeCount: 1284, grossTotal: 1764000, netTotal: 1240000, status: "PAID" },
  { id: "pr-2026-09", reference: "PR-2026-09", period: "September 2026", employeeCount: 1284, grossTotal: 1782000, netTotal: 1256000, status: "PENDING_APPROVAL" },
  { id: "pr-2026-10", reference: "PR-2026-10", period: "October 2026", employeeCount: 0, grossTotal: 0, netTotal: 0, status: "DRAFT" },
];
