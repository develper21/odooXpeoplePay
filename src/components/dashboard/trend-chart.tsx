"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export function TrendChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const hasData = data && data.length > 0 && data.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Monthly net salary trend</CardTitle>
          <p className="mt-1 text-xs text-text-muted">
            Historical net salary disbursement over last 6 months
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {!hasData ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Inbox className="mb-2 size-7 text-text-muted opacity-60" />
              <p className="text-xs font-medium text-text-secondary">
                No historical payroll data available for the selected filters.
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Reset filters to view company-wide disbursement trends.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salaryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#3b82f6"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#263244"
                  vertical={false}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    `₹${Number(val || 0).toLocaleString("en-IN")}`,
                    "Net Salary Paid",
                  ]}
                  contentStyle={{
                    background: "#161d2a",
                    border: "1px solid #263244",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#salaryFill)"
                  dot={{ r: 3, fill: "#3b82f6" }}
                  activeDot={{ r: 5, fill: "#60a5fa" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
