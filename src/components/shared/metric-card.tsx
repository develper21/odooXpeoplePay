import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Metric } from "@/types";

export function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight;
  const content = (
    <Card className="group p-5 transition-colors hover:border-border-subtle hover:bg-surface-raised/40">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-text-secondary">{metric.label}</p>
        <span className="flex items-center gap-1 rounded-md bg-surface-raised p-1.5 text-primary">
          <span className="block size-2 rounded-full bg-current" />
          {metric.href && <ChevronRight className="size-3 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{metric.value}</p>
      <div className={metric.trend === "up" ? "mt-2 flex items-center gap-1 text-xs text-success" : "mt-2 flex items-center gap-1 text-xs text-warning"}>
        <Icon className="size-3" />
        {metric.change}
        <span className="text-text-muted">vs last period</span>
      </div>
    </Card>
  );

  if (metric.href) {
    return <Link href={metric.href} className="block">{content}</Link>;
  }
  return content;
}
