"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEmployee, useEmployeeContracts } from "@/hooks/use-data";
import { formatDate, employeeName } from "@/lib/hr-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PermissionGate } from "@/components/auth/permission-gate";

export default function EmployeeContractsPage() { const { id } = useParams<{ id: string }>(); const { data: employee, isLoading: employeeLoading } = useEmployee(id); const { data: contracts = [], isLoading, isError } = useEmployeeContracts(id); if (employeeLoading || isLoading) return <LoadingState />; if (!employee || isError) return <ErrorState message="Employee contract history could not be loaded." />; return <><PageHeader title={`${employeeName(employee)} · Contracts`} description="Current and historical employment agreements." action={{ label: "Create Contract", href: "/contracts/new" }} />{contracts.length === 0 ? <EmptyState title={`No contracts found for ${employeeName(employee)}`} message="Create a contract to connect this employee to a payroll period." /> : <div className="space-y-4">{contracts.sort((a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE")).map((contract) => <Card key={contract.id} className={contract.status === "ACTIVE" ? "border-success/40" : undefined}><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><h2 className="font-semibold">{contract.reference}</h2><StatusBadge status={contract.status.toLowerCase() as "active" | "expired" | "draft" | "terminated"} /></div><p className="mt-2 text-sm text-text-secondary">{contract.title} · {contract.position} · {contract.department}</p><p className="mt-2 text-xs text-text-muted">{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</p></div><div className="flex items-center gap-4"><p className="text-xl font-bold">${contract.monthlySalary.toLocaleString()}<span className="ml-1 text-xs font-normal text-text-muted">/ month</span></p><Link href={`/contracts/${contract.id}`} className="text-xs text-primary">View details</Link></div></div></Card>)}</div>}<PermissionGate permission="contract.create"><p className="mt-4 text-xs text-text-muted">Contract history is preserved so future payroll periods can select the applicable agreement.</p></PermissionGate></>; }
