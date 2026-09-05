import type { SalaryStructure } from "@/types/domain";
export const mockSalaryStructures: SalaryStructure[] = [
  { id: "ss-001", name: "US Salaried Standard", currency: "USD", basePercentage: 100, ruleIds: ["sr-001", "sr-002", "sr-003"] },
  { id: "ss-002", name: "US Sales Commission", currency: "USD", basePercentage: 100, ruleIds: ["sr-001", "sr-002", "sr-004"] },
];
