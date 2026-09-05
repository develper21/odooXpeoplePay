"use client";

import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Clock3, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimeOffOverview as TimeOffOverviewType } from "@/types/domain";

interface TimeOffOverviewProps {
  overview: TimeOffOverviewType;
}

export function TimeOffOverview({ overview }: TimeOffOverviewProps) {
  const usedDays = Math.max(0, overview.totalAllocatedDays - overview.totalRemainingDays);
  const utilizationRate =
    overview.totalAllocatedDays > 0
      ? Math.round((usedDays / overview.totalAllocatedDays) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Time Off & Leave Balances</CardTitle>
          <p className="mt-1 text-xs text-text-muted">
            Approved leaves, pending approvals, and workforce quota utilization
          </p>
        </div>
        <Link
          href="/time-off/requests"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View Requests <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Mini Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border-subtle bg-surface p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" />
              <span className="text-xs text-text-muted">Approved Leaves</span>
            </div>
            <p className="mt-2 text-xl font-bold text-text-primary">
              {overview.approvedDays} <span className="text-xs font-normal text-text-muted">days</span>
            </p>
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface p-3">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-warning" />
              <span className="text-xs text-text-muted">Pending Requests</span>
            </div>
            <p className="mt-2 text-xl font-bold text-text-primary">
              {overview.pendingRequests}{" "}
              <span className="text-xs font-normal text-text-muted">awaiting</span>
            </p>
          </div>

          <div className="col-span-2 rounded-lg border border-border-subtle bg-surface p-3 sm:col-span-1">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span className="text-xs text-text-muted">Remaining Balance</span>
            </div>
            <p className="mt-2 text-xl font-bold text-text-primary">
              {overview.totalRemainingDays}{" "}
              <span className="text-xs font-normal text-text-muted">
                / {overview.totalAllocatedDays} days
              </span>
            </p>
          </div>
        </div>

        {/* Quota Utilization Bar */}
        <div className="rounded-lg border border-border-subtle bg-surface-raised/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">Quota Utilization</span>
            <span className="font-bold text-text-primary">{utilizationRate}% consumed</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(utilizationRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Breakdown by Type */}
        {overview.byType.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">
              Approved Days by Leave Type
            </p>
            <div className="flex flex-wrap gap-2">
              {overview.byType.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs"
                >
                  <Calendar className="size-3 text-text-muted" />
                  <span className="font-medium text-text-primary">{item.type}:</span>
                  <span className="font-bold text-primary">{item.days} d</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
