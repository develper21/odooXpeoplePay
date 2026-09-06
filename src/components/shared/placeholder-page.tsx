"use client";

import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import type { Permission } from "@/lib/permissions";

export function PlaceholderPage({
  title,
  description,
  actionPermission,
  actionLabel = "Create new",
}: {
  title: string;
  description: string;
  actionPermission?: Permission;
  actionLabel?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
          <span className="mb-4 rounded-lg bg-primary/10 p-3 text-primary">
            <Construction className="size-6" />
          </span>
          <h2 className="text-base font-semibold">Foundation ready</h2>
          <p className="mt-2 max-w-md text-sm text-text-secondary">
            This module is prepared for the next sprint. Its connected workflows
            and data views will be implemented here.
          </p>
          {actionPermission && (
            <PermissionGate permission={actionPermission}>
              <Button className="mt-5" size="sm">
                {actionLabel}
              </Button>
            </PermissionGate>
          )}
        </CardContent>
      </Card>
    </>
  );
}
