"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox } from "lucide-react";

export function SalaryChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const hasData = data && data.length > 0 && data.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Salary cost by department</CardTitle>
          <p className="mt-1 text-xs text-text-muted">
            Net salary expenditure breakdown for filtered records
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {!hasData ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Inbox className="mb-2 size-7 text-text-muted opacity-60" />
              <p className="text-xs font-medium text-text-secondary">
                No payroll data available for the selected filters.
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Try selecting a different department or period.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, left: 16, right: 24, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="#263244"
                  horizontal={false}
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    `₹${Number(val || 0).toLocaleString("en-IN")}`,
                    "Net Salary",
                  ]}
                  contentStyle={{
                    background: "#161d2a",
                    border: "1px solid #263244",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "#ffffff08" }}
                />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
