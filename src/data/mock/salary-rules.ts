import type { SalaryRule } from "@/types/domain";
export const mockSalaryRules: SalaryRule[] = [
  { id: "sr-001", code: "BASIC", name: "Basic Salary", category: "EARNING", amount: 100, kind: "PERCENTAGE" },
  { id: "sr-002", code: "TAX", name: "Federal Tax", category: "DEDUCTION", amount: 18, kind: "PERCENTAGE" },
  { id: "sr-003", code: "BENEFITS", name: "Benefits Contribution", category: "DEDUCTION", amount: 220, kind: "FIXED" },
  { id: "sr-004", code: "COMM", name: "Sales Commission", category: "EARNING", amount: 6, kind: "PERCENTAGE" },
];
