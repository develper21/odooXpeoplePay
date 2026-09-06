"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useContract,
  useEmployees,
  useSalaryStructures,
  useUpdateContract,
} from "@/hooks/use-data";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "@/components/contracts/contract-form";

export default function EditContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: contract, isLoading, isError } = useContract(id);
  const { data: employees = [] } = useEmployees();
  const { data: structures = [] } = useSalaryStructures();
  const mutation = useUpdateContract();
  if (isLoading) return <LoadingState />;
  if (isError || !contract)
    return <ErrorState message="Contract record was not found." />;
  return (
    <>
      <PageHeader
        title="Edit Contract"
        description={`Update ${contract.reference} without losing its history.`}
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <ContractForm
            initialValues={contract}
            employees={employees}
            structures={structures}
            submitting={mutation.isPending}
            submitLabel="Update Contract"
            onCancel={() => router.push(`/contracts/${id}`)}
            onSubmit={async (values) => {
              await mutation.mutateAsync({ id, input: values });
              router.push(`/contracts/${id}`);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Contract could not be updated.
        </p>
      )}
    </>
  );
}
