import type { SalaryStructure } from "@/types/domain";

export const mockSalaryStructures: SalaryStructure[] = [
  {
    id: "ss-001",
    name: "Regular Salary",
    description: "Standard permanent employment salary structure with housing, transport, PF, and TDS calculation.",
    status: "ACTIVE",
    currency: "INR",
    basePercentage: 100,
    ruleIds: [
      "sr-001", // 10 BASIC
      "sr-002", // 20 HRA
      "sr-003", // 30 TRANSPORT
      "sr-006", // 40 GROSS
      "sr-007", // 60 PF
      "sr-010", // 70 TAX
      "sr-012", // 90 NET
    ],
  },
  {
    id: "ss-002",
    name: "Sales & Executive Salary",
    description: "Executive and sales structure including base wage, housing, transport, sales commission, PF, and tax.",
    status: "ACTIVE",
    currency: "INR",
    basePercentage: 100,
    ruleIds: [
      "sr-001",
      "sr-002",
      "sr-003",
      "sr-005", // COMMISSION
      "sr-006",
      "sr-007",
      "sr-008", // PROF_TAX
      "sr-010",
      "sr-012",
    ],
  },
  {
    id: "ss-003",
    name: "Part-Time Salary",
    description: "Hourly and part-time staff structure with commuting support and simplified tax withholding.",
    status: "ACTIVE",
    currency: "INR",
    basePercentage: 100,
    ruleIds: [
      "sr-013", // HOURLY_BASE
      "sr-003", // TRANSPORT
      "sr-006", // GROSS
      "sr-008", // PROF_TAX
      "sr-010", // TAX
      "sr-012", // NET
    ],
  },
  {
    id: "ss-004",
    name: "Contractor Salary",
    description: "Professional services retainer structure with Section 194J TDS deduction.",
    status: "ACTIVE",
    currency: "INR",
    basePercentage: 100,
    ruleIds: [
      "sr-014", // CONSULTANT_FEE
      "sr-015", // TDS_CONTRACTOR
      "sr-012", // NET
    ],
  },
];
