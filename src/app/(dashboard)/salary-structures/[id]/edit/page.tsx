"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useSalaryRules,
  useSalaryStructure,
  useUpdateSalaryStructure,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { SalaryStructureForm } from "@/components/salary/salary-structure-form";

export default function EditSalaryStructurePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: structure, isLoading: structureLoading, isError } = useSalaryStructure(id);
  const { data: allRules = [], isLoading: rulesLoading } = useSalaryRules();
  const updateStructure = useUpdateSalaryStructure();

  if (structureLoading || rulesLoading) return <LoadingState />;
  if (isError || !structure) {
    return <ErrorState message="Salary structure could not be found." />;
  }

  const canEdit = Boolean(user && canAccess(user.role, "salary_structure.update"));
  if (!canEdit) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-center text-danger">
        <p className="font-semibold">Unauthorized Access</p>
        <p className="mt-1 text-xs text-text-muted">
          Your role does not have permission to modify salary structures.
        </p>
      </div>
    );
  }

  const handleSubmit = async (values: any) => {
    await updateStructure.mutateAsync({ id, input: values });
    router.push(`/salary-structures/${id}`);
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/salary-structures/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Structure Details
        </Link>
      </div>

      <PageHeader
        title={`Edit Structure: ${structure.name}`}
        description="Update salary structure metadata, reorder execution rules, and verify changes with live preview."
      />

      <SalaryStructureForm
        initialValues={structure}
        allRules={allRules}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/salary-structures/${id}`)}
        submitting={updateStructure.isPending}
        submitLabel="Update Structure"
      />
    </>
  );
}
