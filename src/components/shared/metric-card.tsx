import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Metric } from "@/types";

export function MetricCard({ metric }: { metric: Metric }) { const Icon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight; return <Card className="p-5"><div className="flex items-start justify-between"><p className="text-xs font-medium text-text-secondary">{metric.label}</p><span className="rounded-md bg-surface-raised p-2 text-primary"><span className="block size-2 rounded-full bg-current" /></span></div><p className="mt-4 text-2xl font-bold tracking-tight">{metric.value}</p><div className={metric.trend === "up" ? "mt-2 flex items-center gap-1 text-xs text-success" : "mt-2 flex items-center gap-1 text-xs text-warning"}><Icon className="size-3" />{metric.change}<span className="text-text-muted">vs last month</span></div></Card>; }
