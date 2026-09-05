"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, Clock, AlertOctagon, Timer, Edit3, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceOverview as AttendanceOverviewType } from "@/types/domain";

interface AttendanceOverviewProps {
  overview: AttendanceOverviewType;
}

export function AttendanceOverview({ overview }: AttendanceOverviewProps) {
  const items = [
    { label: "Present", count: overview.present, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Late Arrivals", count: overview.late, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Absent", count: overview.absent, icon: AlertOctagon, color: "text-danger", bg: "bg-danger/10" },
    { label: "Overtime", count: overview.overtime, icon: Timer, color: "text-primary", bg: "bg-primary/10" },
    { label: "Missing Checkouts", count: overview.missingCheckout, icon: HelpCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Manual Edits", count: overview.manualEdit, icon: Edit3, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Attendance Health & Patterns</CardTitle>
          <p className="mt-1 text-xs text-text-muted">
            Workforce attendance statistics for the filtered period
          </p>
        </div>
        <Link
          href="/attendance"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View Attendance <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage Bar */}
        <div className="rounded-lg border border-border-subtle bg-surface-raised/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">Overall Coverage Health</span>
            <span className="font-bold text-text-primary">{overview.coveragePercent}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overview.coveragePercent >= 90
                  ? "bg-success"
                  : overview.coveragePercent >= 75
                  ? "bg-warning"
                  : "bg-danger"
              }`}
              style={{ width: `${Math.min(overview.coveragePercent, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-text-muted">
            Based on {overview.totalRecords.toLocaleString()} logged attendance records
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface p-2.5"
              >
                <span className={`rounded-md p-2 ${item.bg} ${item.color}`}>
                  <Icon className="size-3.5" />
                </span>
                <div>
                  <p className="text-[11px] font-medium text-text-muted">{item.label}</p>
                  <p className="text-sm font-bold text-text-primary">{item.count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
