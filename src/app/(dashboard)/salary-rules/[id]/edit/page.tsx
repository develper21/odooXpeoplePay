"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useSalaryRule,
  useSalaryRules,
  useUpdateSalaryRule,
} from "@/hooks/use-data";
import { canAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { SalaryRuleForm } from "@/components/salary/salary-rule-form";

export default function EditSalaryRulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: rule, isLoading: ruleLoading, isError } = useSalaryRule(id);
  const { data: allRules = [], isLoading: rulesLoading } = useSalaryRules();
  const updateRule = useUpdateSalaryRule();

  if (ruleLoading || rulesLoading) return <LoadingState />;
  if (isError || !rule) {
    return <ErrorState message="Salary rule could not be found." />;
  }

  const canEdit = Boolean(user && canAccess(user.role, "salary_rule.update"));
  if (!canEdit) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-center text-danger">
        <p className="font-semibold">Unauthorized Access</p>
        <p className="mt-1 text-xs text-text-muted">
          Your role does not have permission to modify salary rules.
        </p>
      </div>
    );
  }

  const handleSubmit = async (values: any) => {
    await updateRule.mutateAsync({ id, input: values });
    router.push(`/salary-rules/${id}`);
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/salary-rules/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Rule Details
        </Link>
      </div>

      <PageHeader
        title={`Edit Rule: ${rule.name}`}
        description="Update salary rule configuration, category, formula expression, or execution sequence."
      />

      <SalaryRuleForm
        initialValues={rule}
        allRules={allRules}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/salary-rules/${id}`)}
        submitting={updateRule.isPending}
        submitLabel="Update Rule"
      />
    </>
  );
}
