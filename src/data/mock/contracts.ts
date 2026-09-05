import type { Contract } from "@/types/domain";
export const mockContracts: Contract[] = [
  { id: "con-001", employeeId: "emp-001", title: "Permanent Employment", startDate: "2021-04-12", status: "ACTIVE", monthlySalary: 9200 },
  { id: "con-002", employeeId: "emp-002", title: "Permanent Employment", startDate: "2022-08-01", endDate: "2026-10-31", status: "ACTIVE", monthlySalary: 6800 },
  { id: "con-003", employeeId: "emp-003", title: "Permanent Employment", startDate: "2020-11-09", status: "ACTIVE", monthlySalary: 7400 },
  { id: "con-004", employeeId: "emp-004", title: "Fixed Term Contract", startDate: "2024-01-15", endDate: "2025-01-14", status: "EXPIRED", monthlySalary: 5100 },
  { id: "con-006", employeeId: "emp-006", title: "Executive Employment", startDate: "2019-02-04", status: "ACTIVE", monthlySalary: 14200 },
  { id: "con-007", employeeId: "emp-007", title: "Permanent Employment", startDate: "2018-09-17", endDate: "2026-02-28", status: "EXPIRED", monthlySalary: 11800 },
  { id: "con-008", employeeId: "emp-008", title: "Permanent Employment", startDate: "2024-03-18", status: "ACTIVE", monthlySalary: 4800 },
];
