"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateTimeOffType } from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { TimeOffTypeForm } from "@/components/time-off/type-form";
import type { TimeOffType } from "@/types/domain";

export default function NewTimeOffTypePage() {
  const router = useRouter();
  const mutation = useCreateTimeOffType();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title="New Leave Type"
        description="Configure a new time off policy for your organization."
      />
      <Card>
        <CardContent className="p-5 sm:p-7">
          <TimeOffTypeForm
            submitting={mutation.isPending}
            onCancel={() => router.back()}
            onSubmit={async (values) => {
              await mutation.mutateAsync(values as Omit<TimeOffType, "id">);
              setToastMessage("Time Off Type created successfully.");
              setTimeout(() => {
                router.push("/time-off/types");
              }, 600);
            }}
          />
        </CardContent>
      </Card>
      {mutation.isError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Leave type could not be created.
        </p>
      )}
    </>
  );
}
