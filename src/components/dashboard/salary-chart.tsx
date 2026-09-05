"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SalaryChart({ data }: { data: { name: string; value: number }[] }) { return <Card><CardHeader><div><CardTitle>Salary cost by department</CardTitle><p className="mt-1 text-xs text-text-muted">Monthly payroll allocation · data source configured by environment</p></div></CardHeader><CardContent><div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}><CartesianGrid stroke="#263244" horizontal={false} /><XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} /><YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={78} /><Tooltip contentStyle={{ background: "#161d2a", border: "1px solid #263244", borderRadius: 6, fontSize: 11 }} cursor={{ fill: "#ffffff08" }} /><Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} /></BarChart></ResponsiveContainer></div></CardContent></Card>; }
