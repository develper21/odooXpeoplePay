"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import { useEmployees } from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "@/components/shared/states";
import {
  DataTable,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, matchesEmployee } from "@/lib/utils";

const badgeStatus = (status: string) =>
  status.toLowerCase() as "active" | "inactive" | "on_leave";
const departments = [
  "All departments",
  "Engineering",
  "People",
  "Operations",
  "Finance",
  "Sales",
  "Marketing",
  "Administration",
];
const initials = (firstName: string, lastName: string) =>
  `${firstName[0]}${lastName[0]}`;

export default function EmployeesPage() {
  const { data: employees = [], isLoading, isError } = useEmployees();
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [department, setDepartment] = useState("All departments");
  const visibleEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const haystack =
          `${employeeName(employee)} ${employee.employeeNumber} ${employee.email} ${employee.department} ${employee.position}`.toLowerCase();
        return (
          haystack.includes(search.toLowerCase()) &&
          (status === "ALL" ||
            employee.status?.toUpperCase() === status.toUpperCase()) &&
          (department === "All departments" ||
            employee.department === department) &&
          (user?.role !== "EMPLOYEE" ||
            matchesEmployee(employee.id, user.employeeId) ||
            matchesEmployee(employee.employeeNumber, user.employeeId))
        );
      }),
    [department, employees, search, status, user],
  );
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Employees could not be loaded." />;
  const canCreate = Boolean(user && canAccess(user.role, "employee.create"));
  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage employee records and workforce information."
        action={
          canCreate
            ? { label: "New Employee", href: "/employees/new" }
            : undefined
        }
      />
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, code, department..."
              className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-raised pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-raised pl-3 pr-8 text-xs font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              {departments.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearch("");
                setStatus("ALL");
                setDepartment("All departments");
              }}
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-xs text-text-secondary hover:bg-surface-raised"
            >
              <SlidersHorizontal className="size-3.5" />
              Reset
            </button>
            <div className="flex rounded-md border bg-surface-raised p-1">
              <button
                onClick={() => setView("list")}
                aria-label="List view"
                className={cn(
                  "rounded p-1.5",
                  view === "list" && "bg-primary text-white",
                )}
              >
                <List className="size-4" />
              </button>
              <button
                onClick={() => setView("kanban")}
                aria-label="Kanban view"
                className={cn(
                  "rounded p-1.5",
                  view === "kanban" && "bg-primary text-white",
                )}
              >
                <Grid2X2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>
      {visibleEmployees.length === 0 ? (
        <EmptyState
          title="No employees found"
          message="Try changing your search or filters."
        />
      ) : view === "list" ? (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHeader>
          <tbody>
            {visibleEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Link
                    href={`/employees/${employee.id}`}
                    className="flex items-center gap-3 hover:text-primary"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {initials(employee.firstName, employee.lastName)}
                    </span>
                    <span>
                      <span className="block font-medium">
                        {employeeName(employee)}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {employee.email}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {employee.employeeNumber}
                </TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell className="text-text-secondary">
                  {employee.position}
                </TableCell>
                <TableCell className="text-xs text-text-secondary capitalize">
                  {(employee.employeeType || "Full Time").replace(/_/g, " ")}
                </TableCell>
                <TableCell>
                  <StatusBadge status={badgeStatus(employee.status)} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/employees/${employee.id}`}
                    className="text-xs text-primary"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleEmployees.map((employee) => (
            <Link
              key={employee.id}
              href={`/employees/${employee.id}`}
              className="group"
            >
              <Card className="h-full p-5 transition-colors hover:border-primary/60">
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {initials(employee.firstName, employee.lastName)}
                  </span>
                  <StatusBadge status={badgeStatus(employee.status)} />
                </div>
                <p className="mt-4 font-semibold group-hover:text-primary">
                  {employeeName(employee)}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {employee.position}
                </p>
                <div className="mt-4 space-y-2 border-t pt-4 text-xs text-text-muted">
                  <p className="flex justify-between">
                    <span>Code</span>
                    <span className="text-text-secondary">
                      {employee.employeeNumber}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Department</span>
                    <span className="text-text-secondary">
                      {employee.department}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Type</span>
                    <span className="text-text-secondary capitalize">
                      {(employee.employeeType || "Full Time").replace(/_/g, " ")}
                    </span>
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
