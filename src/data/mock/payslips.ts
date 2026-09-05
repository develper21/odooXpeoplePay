import type { Payslip } from "@/types/domain";
export const mockPayslips: Payslip[] = [
  { id: "ps-001", payrunId: "pr-2026-08", employeeId: "emp-001", reference: "PS-2026-08-001", gross: 9200, net: 7360, status: "PAID" },
  { id: "ps-002", payrunId: "pr-2026-08", employeeId: "emp-002", reference: "PS-2026-08-002", gross: 6800, net: 5416, status: "PAID" },
  { id: "ps-003", payrunId: "pr-2026-09", employeeId: "emp-001", reference: "PS-2026-09-001", gross: 9200, net: 7360, status: "DUPLICATE_WARNING" },
];
