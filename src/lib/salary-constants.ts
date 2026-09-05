import type { ComputationType, SalaryRuleCategory, SalaryRuleStatus, SalaryStructureStatus } from "@/types/domain";

export const SALARY_RULE_CATEGORIES: { value: SalaryRuleCategory; label: string; kind: "earning" | "deduction" | "total" }[] = [
  { value: "BASIC", label: "Basic Salary", kind: "earning" },
  { value: "ALLOWANCE", label: "Allowance", kind: "earning" },
  { value: "GROSS", label: "Gross", kind: "total" },
  { value: "DEDUCTION", label: "Deduction", kind: "deduction" },
  { value: "NET", label: "Net Salary", kind: "total" },
];

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  BASIC: "Basic",
  ALLOWANCE: "Allowance",
  EARNING: "Earning",
  GROSS: "Gross",
  DEDUCTION: "Deduction",
  NET: "Net Salary",
};

export const COMPUTATION_TYPES: { value: ComputationType; label: string; description: string }[] = [
  { value: "FIXED", label: "Fixed Amount", description: "Static numerical amount (e.g. ₹50,000)" },
  { value: "PERCENTAGE", label: "Percentage", description: "Percentage calculated on one or more base rules (e.g. 20% of BASIC)" },
  { value: "FORMULA", label: "Formula", description: "Controlled arithmetic expression (e.g. BASIC + HRA - TAX)" },
];

export const COMPUTATION_TYPE_LABEL_MAP: Record<ComputationType, string> = {
  FIXED: "Fixed Amount",
  PERCENTAGE: "Percentage",
  FORMULA: "Formula",
};

export const SALARY_STRUCTURE_STATUSES: { value: SalaryStructureStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DRAFT", label: "Draft" },
];

export const SALARY_RULE_STATUSES: { value: SalaryRuleStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DRAFT", label: "Draft" },
];
