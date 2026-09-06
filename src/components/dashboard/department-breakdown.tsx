"use client";

import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/shared/table";
import type { DepartmentBreakdownItem } from "@/types/domain";

interface DepartmentBreakdownProps {
  breakdown: DepartmentBreakdownItem[];
}

export function DepartmentBreakdown({ breakdown }: DepartmentBreakdownProps) {
  const safeBreakdown = breakdown || [];
  const totalEmployees = safeBreakdown.reduce(
    (s, d) => s + (Number(d.headcount) || 0),
    0,
  );
  const totalNet = safeBreakdown.reduce((s, d) => s + (Number(d.totalNet) || 0), 0);
  const totalGross = safeBreakdown.reduce((s, d) => s + (Number(d.totalGross) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Department Headcount & Payroll Expenditure</CardTitle>
          <p className="mt-1 text-xs text-text-muted">
            Aggregated staffing headcount and total salary commitment by
            department
          </p>
        </div>
        <Link
          href="/reports"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Detailed Reports <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable>
          <TableHeader>
            <tr>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-right">Headcount</th>
              <th className="px-4 py-3 text-right">Gross Total</th>
              <th className="px-4 py-3 text-right">Deductions</th>
              <th className="px-4 py-3 text-right">Net Expenditure</th>
              <th className="px-4 py-3 text-right">Avg Net Salary</th>
            </tr>
          </TableHeader>
          <tbody>
            {safeBreakdown.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-center text-text-muted"
                  aria-colspan={6}
                >
                  No department records found for the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              safeBreakdown.map((item) => (
                <TableRow key={item.department}>
                  <TableCell className="font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 text-primary" />
                      <span>{item.department}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 rounded bg-surface-raised px-2 py-0.5 text-xs font-semibold text-text-secondary">
                      <Users className="size-3 text-text-muted" />
                      {item.headcount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-text-secondary">
                    ₹{item.totalGross.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-danger/80">
                    ₹{item.totalDeductions.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-text-primary">
                    ₹{item.totalNet.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-text-muted">
                    ₹{item.averageNet.toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
          {safeBreakdown.length > 0 && (
            <tfoot>
              <tr className="border-t border-border-subtle bg-surface-raised/40 font-semibold">
                <td className="px-4 py-3 text-xs text-text-primary">
                  Total Summary
                </td>
                <td className="px-4 py-3 text-right text-xs text-text-primary">
                  {totalEmployees}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text-primary">
                  ₹{totalGross.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-danger/90">
                  ₹{(totalGross - totalNet).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-primary">
                  ₹{totalNet.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text-muted">
                  ₹
                  {totalEmployees > 0
                    ? Math.round(totalNet / totalEmployees).toLocaleString(
                        "en-IN",
                      )
                    : 0}
                </td>
              </tr>
            </tfoot>
          )}
        </DataTable>
      </CardContent>
    </Card>
  );
}
