import type { ScheduleDay, WorkingSchedule } from "@/types/domain";

const weekdays = (breakMinutes = 60): ScheduleDay[] => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => ({ day, enabled: index < 5, startTime: index < 5 ? "09:00" : "", endTime: index < 5 ? "18:00" : "", breakMinutes: index < 5 ? breakMinutes : 0 }));
export const mockSchedules: WorkingSchedule[] = [
  { id: "sch-001", name: "Standard 40 Hours", type: "STANDARD", status: "ACTIVE", timezone: "America/New_York", weeklyHours: 40, days: weekdays() },
  { id: "sch-002", name: "Sales Flex", type: "FLEXIBLE", status: "ACTIVE", timezone: "America/Chicago", weeklyHours: 40, days: weekdays(60).map((day) => ({ ...day, startTime: day.enabled ? "08:30" : "", endTime: day.enabled ? "17:30" : "" })) },
  { id: "sch-003", name: "Part-time Support", type: "PART_TIME", status: "ACTIVE", timezone: "America/New_York", weeklyHours: 24, days: weekdays(30).map((day, index) => ({ ...day, enabled: [0, 2, 4].includes(index), startTime: [0, 2, 4].includes(index) ? "09:00" : "", endTime: [0, 2, 4].includes(index) ? "18:00" : "", breakMinutes: [0, 2, 4].includes(index) ? 30 : 0 })) },
  { id: "sch-004", name: "Operations Shift", type: "SHIFT", status: "ACTIVE", timezone: "America/New_York", weeklyHours: 36, days: weekdays(45).map((day, index) => ({ ...day, enabled: index < 4, startTime: index < 4 ? "10:00" : "", endTime: index < 4 ? "19:00" : "", breakMinutes: index < 4 ? 45 : 0 })) },
  { id: "sch-005", name: "Legacy Schedule", type: "STANDARD", status: "INACTIVE", timezone: "America/New_York", weeklyHours: 40, days: weekdays() },
];
