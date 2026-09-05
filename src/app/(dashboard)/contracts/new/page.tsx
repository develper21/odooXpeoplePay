"use client";

import { useRouter } from "next/navigation";
import { useContracts, useCreateContract, useEmployees, useSalaryStructures } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ContractForm } from "@/components/contracts/contract-form";

export default function NewContractPage() { const router = useRouter(); const { data: employees = [] } = useEmployees(); const { data: structures = [] } = useSalaryStructures(); const { data: contracts = [] } = useContracts(); const mutation = useCreateContract(); return <><PageHeader title="New Contract" description="Connect an employee to a dated wage and salary structure." /><Card><CardContent className="p-5 sm:p-7"><ContractForm employees={employees} structures={structures} submitting={mutation.isPending} onCancel={() => router.back()} onSubmit={async (values) => { await mutation.mutateAsync(values); router.push(`/employees/${values.employeeId}/contracts`); }} /></CardContent></Card>{mutation.isError && <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">Contract could not be created.</p>}<p className="sr-only">Existing contracts: {contracts.length}</p></>; }
