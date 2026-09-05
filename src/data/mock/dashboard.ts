import type { DashboardData } from "@/types/domain";
export const mockDashboard: DashboardData = {
  metrics: [
    { label: "Total net salary paid", value: "$1.24M", change: "+12.5%", trend: "up", tone: "blue" },
    { label: "Payslips generated", value: "1,248", change: "+6.2%", trend: "up", tone: "green" },
    { label: "Average salary", value: "$6,842", change: "+3.1%", trend: "up", tone: "violet" },
    { label: "Approved time off", value: "86", change: "-4.8%", trend: "down", tone: "amber" },
    { label: "Attendance health", value: "96.4%", change: "+1.8%", trend: "up", tone: "green" },
  ],
  alerts: [
    { label: "3 payroll items need review", detail: "Payrun PR-2026-09 is awaiting approval", tone: "warning" },
    { label: "2 contracts expire this month", detail: "Review upcoming contract renewals", tone: "pending" },
    { label: "Attendance exception detected", detail: "Theo Meyer is missing a checkout", tone: "error" },
  ],
  activeEmployees: 1284,
  presentToday: 1241,
  pendingRequests: 18,
  salaryByDepartment: [{ name: "Engineering", value: 420 }, { name: "Sales", value: 310 }, { name: "Operations", value: 245 }, { name: "People", value: 180 }],
  salaryTrend: [{ name: "Apr", value: 490 }, { name: "May", value: 520 }, { name: "Jun", value: 548 }, { name: "Jul", value: 566 }, { name: "Aug", value: 590 }, { name: "Sep", value: 612 }],
};
