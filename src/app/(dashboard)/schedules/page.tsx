"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSchedules, useEmployees } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { formatDuration, calculateWeeklyMinutes } from "@/lib/time-utils";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, TableCell, TableHeader, TableRow } from "@/components/shared/table";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";

export default function SchedulesPage() { 
  const { data: schedules = [], isLoading, isError } = useSchedules(); 
  const { data: employees = [] } = useEmployees(); 
  const { user } = useAuth(); 
  const [search, setSearch] = useState(""); 
  const [type, setType] = useState("ALL"); 
  const [status, setStatus] = useState("ALL"); 

  const filtered = useMemo(() => schedules.filter((schedule) => 
    schedule.name.toLowerCase().includes(search.toLowerCase()) && 
    (type === "ALL" || schedule.type === type) &&
    (status === "ALL" || schedule.status === status)
  ), [schedules, search, type, status]); 

  if (isLoading) return <LoadingState />; 
  if (isError) return <ErrorState message="Schedules could not be loaded." />; 

  const canCreate = Boolean(user && canAccess(user.role, "schedule.create")); 

  return (
    <>
      <PageHeader title="Working Schedules" description="Define expected working patterns for your workforce." action={canCreate ? { label: "New Schedule", href: "/schedules/new" } : undefined} />
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search schedules..." className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none" />
          </div>
          <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary">
            <option value="ALL">All types</option>
            <option value="STANDARD">Standard</option>
            <option value="FLEXIBLE">Flexible</option>
            <option value="SHIFT">Shift</option>
            <option value="PART_TIME">Part time</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DRAFT">Draft</option>
          </select>
          <button onClick={() => { setSearch(""); setType("ALL"); setStatus("ALL"); }} className="h-10 rounded-md px-3 text-xs text-text-secondary hover:bg-surface-raised">Reset</button>
        </div>
      </Card>
      {filtered.length === 0 ? <EmptyState title="No schedules found" message="Try a different search or create a schedule." /> : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Weekly hours</TableCell>
              <TableCell>Assigned employees</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filtered.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  <Link href={`/schedules/${schedule.id}`} className="font-semibold hover:text-primary">
                    {schedule.name}
                    <span className="mt-1 block text-xs font-normal text-text-muted">{schedule.timezone}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-text-secondary">{schedule.type.replace("_", " ")}</TableCell>
                <TableCell className="font-semibold">{formatDuration(calculateWeeklyMinutes(schedule.days))}</TableCell>
                <TableCell>{employees.filter((employee) => employee.scheduleId === schedule.id).length}</TableCell>
                <TableCell><StatusBadge status={schedule.status.toLowerCase() as "active" | "inactive" | "draft"} /></TableCell>
                <TableCell><Link href={`/schedules/${schedule.id}`} className="text-xs text-primary font-medium hover:underline">View</Link></TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  ); 
}
