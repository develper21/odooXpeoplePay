import type { Contract, ContractStatus, Employee } from "@/types/domain";

export function employeeName(employee?: Employee) { return employee ? `${employee.firstName} ${employee.lastName}` : "Unassigned"; }
export function formatDate(value?: string) { if (!value) return "Present"; return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
export function contractStatusLabel(status: ContractStatus) { return status.replace("_", " "); }
export function getActiveContract(contracts: Contract[]) { return contracts.find((contract) => contract.status === "ACTIVE"); }
