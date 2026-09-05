import type { WorkingSchedule } from "@/types/domain";
export const mockSchedules: WorkingSchedule[] = [
  { id: "sch-001", name: "Northstar Standard", timezone: "America/New_York", weeklyHours: 40, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "sch-002", name: "Sales Flex", timezone: "America/Chicago", weeklyHours: 40, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "sch-003", name: "Part-time Support", timezone: "America/New_York", weeklyHours: 24, days: ["Mon", "Wed", "Fri"] },
];
