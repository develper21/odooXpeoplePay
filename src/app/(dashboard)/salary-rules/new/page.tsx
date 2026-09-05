"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSalaryRule, useSalaryRules } from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/states";
import { SalaryRuleForm } from "@/components/salary/salary-rule-form";

export default function NewSalaryRulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: allRules = [], isLoading: rulesLoading } = useSalaryRules();
  const createRule = useCreateSalaryRule();

  if (rulesLoading) return <LoadingState />;

  const canCreate = Boolean(user && canAccess(user.role, "salary_rule.create"));
  if (!canCreate) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-center text-danger">
        <p className="font-semibold">Unauthorized Access</p>
        <p className="mt-1 text-xs text-text-muted">
          Your role does not have permission to create salary rules.
        </p>
      </div>
    );
  }

  const handleSubmit = async (values: any) => {
    const res = await createRule.mutateAsync(values);
    router.push(`/salary-rules/${(res as any).id || ""}`);
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href="/salary-rules"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Salary Rules
        </Link>
      </div>

      <PageHeader
        title="New Salary Rule"
        description="Configure a new salary component, choose fixed, percentage, or formula computation, and set execution sequence."
      />

      <SalaryRuleForm
        allRules={allRules}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/salary-rules")}
        submitting={createRule.isPending}
        submitLabel="Create Rule"
      />
    </>
  );
}
