"use client";

import { ArrowRight, CalendarClock, CircleAlert, Clock3, UsersRound } from "lucide-react";
import { useDashboard } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/metric-card";
import { LoadingState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { SalaryChart } from "@/components/dashboard/salary-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <p className="rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">Dashboard data could not be loaded.</p>;
  return <><PageHeader title="Dashboard" description="A current view of your people operations and payroll health." action={{ label: "View payrun" }} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{data.metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div><div className="mt-6 grid gap-6 xl:grid-cols-2"><SalaryChart data={data.salaryByDepartment} /><TrendChart data={data.salaryTrend} /></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"><Card><CardHeader><CardTitle>Payroll alerts</CardTitle><button className="text-xs text-primary">View all</button></CardHeader><CardContent className="space-y-1 p-3">{data.alerts.map((alert) => <div key={alert.label} className="flex items-center gap-3 rounded-md p-3 hover:bg-surface-raised"><span className="rounded-md bg-amber-500/10 p-2 text-warning"><CircleAlert className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{alert.label}</p><p className="mt-1 truncate text-xs text-text-muted">{alert.detail}</p></div><StatusBadge status={alert.tone} /></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Today at a glance</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1"><div className="flex items-center gap-3"><UsersRound className="size-4 text-primary" /><div><p className="text-xs text-text-muted">Active employees</p><p className="mt-1 text-lg font-semibold">{data.activeEmployees.toLocaleString()}</p></div></div><div className="flex items-center gap-3"><Clock3 className="size-4 text-success" /><div><p className="text-xs text-text-muted">Present today</p><p className="mt-1 text-lg font-semibold">{data.presentToday.toLocaleString()} <span className="text-xs font-normal text-success">96.7%</span></p></div></div><div className="flex items-center gap-3"><CalendarClock className="size-4 text-warning" /><div><p className="text-xs text-text-muted">Pending requests</p><p className="mt-1 text-lg font-semibold">{data.pendingRequests} <ArrowRight className="ml-1 inline size-3 text-primary" /></p></div></div></CardContent></Card></div></>;
}
