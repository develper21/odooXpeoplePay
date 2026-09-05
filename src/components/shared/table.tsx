import { cn } from "@/lib/utils";
export function DataTable({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm">{children}</table></div>; }
export function TableHeader({ children }: { children: React.ReactNode }) { return <thead className="bg-surface-raised text-[10px] uppercase tracking-wider text-text-muted">{children}</thead>; }
export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) { return <tr className={cn("border-b last:border-0 hover:bg-surface-raised/60", className)}>{children}</tr>; }
export function TableCell({ children, className }: { children?: React.ReactNode; className?: string }) { return <td className={cn("px-4 py-3", className)}>{children}</td>; }
