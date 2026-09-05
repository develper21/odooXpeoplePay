"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSalaryStructure, useSalaryRules } from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/states";
import { SalaryStructureForm } from "@/components/salary/salary-structure-form";

export default function NewSalaryStructurePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: allRules = [], isLoading: rulesLoading } = useSalaryRules();
  const createStructure = useCreateSalaryStructure();

  if (rulesLoading) return <LoadingState />;

  const canCreate = Boolean(user && canAccess(user.role, "salary_structure.create"));
  if (!canCreate) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-center text-danger">
        <p className="font-semibold">Unauthorized Access</p>
        <p className="mt-1 text-xs text-text-muted">
          Your role does not have permission to create salary structures.
        </p>
      </div>
    );
  }

  const handleSubmit = async (values: any) => {
    const res = await createStructure.mutateAsync(values);
    router.push(`/salary-structures/${(res as any).id || ""}`);
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href="/salary-structures"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Salary Structures
        </Link>
      </div>

      <PageHeader
        title="New Salary Structure"
        description="Configure a new compensation container, select salary rules, and verify execution order."
      />

      <SalaryStructureForm
        allRules={allRules}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/salary-structures")}
        submitting={createStructure.isPending}
        submitLabel="Create Structure"
      />
    </>
  );
}
