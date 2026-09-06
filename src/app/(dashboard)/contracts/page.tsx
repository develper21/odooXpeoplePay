"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  useContracts,
  useEmployees,
  useSalaryStructures,
} from "@/hooks/use-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";
import { employeeName, formatDate } from "@/lib/hr-utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/shared/states";
import { Card } from "@/components/ui/card";

export default function ContractsPage() {
  const { data: contracts = [], isLoading, isError } = useContracts();
  const { data: employees = [] } = useEmployees();
  const { data: structures = [] } = useSalaryStructures();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      contracts.filter((contract) => {
        const employee = employees.find(
          (item) => item.id === contract.employeeId,
        );
        return (
          `${contract.reference} ${contract.title} ${employeeName(employee)} ${contract.department} ${contract.position}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (user?.role !== "EMPLOYEE" || contract.employeeId === user.employeeId)
        );
      }),
    [contracts, employees, search, user],
  );
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Contracts could not be loaded." />;
  const canCreate = Boolean(user && canAccess(user.role, "contract.create"));
  return (
    <>
      <PageHeader
        title="Contracts"
        description="Track active agreements, wages, and historical employment records."
        action={
          canCreate
            ? { label: "New Contract", href: "/contracts/new" }
            : undefined
        }
      />
      <Card className="mb-5 p-4">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-3 size-4 text-text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contract, employee, department..."
            className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState
          title="No contracts found"
          message="Try changing your search or create a contract."
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>Contract</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Department / Position</TableCell>
              <TableCell>Wage</TableCell>
              <TableCell>Salary structure</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHeader>
          <tbody>
            {filtered.map((contract) => (
              <TableRow
                key={contract.id}
                className={
                  contract.status === "ACTIVE" ? "bg-success/[0.03]" : undefined
                }
              >
                <TableCell>
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    {contract.reference}
                    <span className="mt-1 block text-xs font-normal text-text-muted">
                      {contract.title}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/employees/${contract.employeeId}`}
                    className="hover:text-primary"
                  >
                    {employeeName(
                      employees.find(
                        (employee) => employee.id === contract.employeeId,
                      ),
                    )}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-text-secondary">
                  {formatDate(contract.startDate)} →{" "}
                  {formatDate(contract.endDate)}
                </TableCell>
                <TableCell>
                  <span className="block">{contract.department}</span>
                  <span className="text-xs text-text-muted">
                    {contract.position}
                  </span>
                </TableCell>
                <TableCell>
                  $
                  {Number(
                    contract.monthlySalary ??
                      (contract as any).salaryAmount ??
                      0,
                  ).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-text-secondary">
                  {structures.find(
                    (structure) => structure.id === contract.salaryStructureId,
                  )?.name ?? "Not assigned"}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      contract.status.toLowerCase() as
                        | "active"
                        | "expired"
                        | "draft"
                        | "terminated"
                    }
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="text-xs text-primary"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
