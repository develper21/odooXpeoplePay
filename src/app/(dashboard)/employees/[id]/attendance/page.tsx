"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAttendance, useEmployee } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { formatDuration, calculateWorkedMinutes } from "@/lib/time-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/states";
import { DataTable, TableCell, TableHeader, TableRow } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function EmployeeAttendancePage() { const { id } = useParams<{ id: string }>(); const { user } = useAuth(); const { data: employee, isLoading: employeeLoading } = useEmployee(id); const { data: records = [], isLoading, isError } = useAttendance(id); if (employeeLoading || isLoading) return <LoadingState />; if (!employee || isError || (user?.role === "EMPLOYEE" && user.employeeId !== id)) return <ErrorState message="Attendance records could not be loaded." />; const canCreate = Boolean(user && canAccess(user.role, "attendance.create")); return <><PageHeader title={`${employeeName(employee)} · Attendance`} description="Actual presence records for this employee." action={canCreate ? { label: "Add Attendance", href: `/attendance/new?employeeId=${id}` } : undefined} />{records.length === 0 ? <EmptyState title={`No attendance records for ${employeeName(employee)}`} message="Add an attendance record when presence is available." /> : <Card><DataTable><TableHeader><TableRow><TableCell>Date</TableCell><TableCell>Check in</TableCell><TableCell>Check out</TableCell><TableCell>Worked hours</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell></TableRow></TableHeader><tbody>{records.map((record) => <TableRow key={record.id}><TableCell>{record.date}</TableCell><TableCell>{record.checkIn || "—"}</TableCell><TableCell>{record.checkOut || "—"}</TableCell><TableCell className="font-semibold">{formatDuration(record.workedMinutes ?? calculateWorkedMinutes(record.checkIn, record.checkOut, record.breakMinutes))}</TableCell><TableCell><StatusBadge status={record.status.toLowerCase() as "present" | "late" | "absent" | "overtime" | "missing_checkout" | "manual_edit"} /></TableCell><TableCell><Link href={`/attendance/${record.id}`} className="text-xs text-primary">View</Link></TableCell></TableRow>)}</tbody></DataTable></Card>}</>; }
