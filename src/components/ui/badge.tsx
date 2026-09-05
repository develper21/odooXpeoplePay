import { cn } from "@/lib/utils";

type Status =
  | "active" | "paid" | "approved" | "present" | "pending" | "warning" | "processing" | "draft"
  | "inactive" | "on_leave" | "expired" | "terminated" | "refused" | "cancelled" | "overtime"
  | "missing_checkout" | "manual_edit" | "absent" | "error" | "late"
  | "computed" | "validated" | "sent" | "info" | "duplicate_warning";

const styles: Record<Status, string> = { 
  active: "bg-green-500/10 text-green-400 border border-green-500/20", 
  paid: "bg-green-500/10 text-green-400 border border-green-500/20", 
  approved: "bg-green-500/10 text-green-400 border border-green-500/20", 
  present: "bg-green-500/10 text-green-400 border border-green-500/20", 
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20", 
  warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20", 
  processing: "bg-blue-500/10 text-blue-400 border border-blue-500/20", 
  draft: "bg-slate-500/10 text-slate-400 border border-slate-500/20", 
  inactive: "bg-slate-500/10 text-slate-400 border border-slate-500/20", 
  on_leave: "bg-amber-500/10 text-amber-400 border border-amber-500/20", 
  expired: "bg-red-500/10 text-red-400 border border-red-500/20", 
  terminated: "bg-red-500/10 text-red-400 border border-red-500/20", 
  refused: "bg-red-500/10 text-red-400 border border-red-500/20", 
  cancelled: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  overtime: "bg-blue-500/10 text-blue-400 border border-blue-500/20", 
  missing_checkout: "bg-amber-500/10 text-amber-400 border border-amber-500/20", 
  manual_edit: "bg-blue-500/10 text-blue-400 border border-blue-500/20", 
  absent: "bg-red-500/10 text-red-400 border border-red-500/20", 
  error: "bg-red-500/10 text-red-400 border border-red-500/20",
  late: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  computed: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  validated: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  sent: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  duplicate_warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
};

const labelMap: Partial<Record<Status, string>> = {
  on_leave: "On Leave",
  missing_checkout: "Missing Checkout",
  manual_edit: "Manual Edit",
};

export function StatusBadge({ status }: { status: Status }) { 
  const displayLabel = labelMap[status] || status.replace(/_/g, " ");
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider", styles[status] || "bg-slate-500/10 text-slate-400")}>{displayLabel}</span>; 
}
