"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowUpRight, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionableAlert } from "@/types/domain";

interface OperationalAlertsProps {
  alerts: ActionableAlert[];
}

export function OperationalAlerts({ alerts }: OperationalAlertsProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Operational Alerts & Exceptions</CardTitle>
          <p className="mt-1 text-xs text-text-muted">
            Live compliance, missing details, and attention items across modules
          </p>
        </div>
        <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
          {alerts.length} {alerts.length === 1 ? "item" : "items"}
        </span>
      </CardHeader>
      <CardContent className="flex-1 space-y-2.5 p-4 pt-0">
        {alerts.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-success/30 bg-success/5 p-4 text-center">
            <CheckCircle2 className="mb-2 size-6 text-success" />
            <p className="text-xs font-medium text-text-primary">
              All payroll & HR operations clear!
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              No blocking errors or missing configurations detected.
            </p>
          </div>
        ) : (
          alerts.slice(0, 6).map((alert) => {
            const isError = alert.severity === "ERROR";
            const isWarning = alert.severity === "WARNING";

            return (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border-subtle bg-surface-raised/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-raised/80"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-md p-1.5 ${
                      isError
                        ? "bg-danger/10 text-danger"
                        : isWarning
                        ? "bg-warning/10 text-warning"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isError ? (
                      <AlertCircle className="size-4" />
                    ) : isWarning ? (
                      <AlertTriangle className="size-4" />
                    ) : (
                      <Info className="size-4" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-text-primary">
                        {alert.title}
                      </p>
                      {alert.entityType && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-muted">
                          {alert.entityType}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {alert.detail}
                    </p>
                  </div>
                </div>

                <Link
                  href={alert.href}
                  className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                >
                  <span>{alert.linkText}</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
