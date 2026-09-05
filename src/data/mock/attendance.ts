import type { AttendanceRecord } from "@/types/domain";
export const mockAttendance: AttendanceRecord[] = [
  { id: "att-001", employeeId: "emp-001", date: "2026-09-04", checkIn: "08:54", checkOut: "17:32", status: "PRESENT" },
  { id: "att-002", employeeId: "emp-002", date: "2026-09-04", checkIn: "09:18", checkOut: "18:06", status: "LATE" },
  { id: "att-003", employeeId: "emp-003", date: "2026-09-04", checkIn: "", status: "ABSENT" },
  { id: "att-004", employeeId: "emp-004", date: "2026-09-04", checkIn: "08:47", status: "MISSING_CHECKOUT" },
  { id: "att-005", employeeId: "emp-006", date: "2026-09-04", checkIn: "08:31", checkOut: "17:15", status: "PRESENT" },
];
