import { cn } from "@/lib/utils";

type Status =
  | "active"
  | "paid"
  | "approved"
  | "present"
  | "pending"
  | "warning"
  | "processing"
  | "draft"
  | "inactive"
  | "on_leave"
  | "expired"
  | "terminated"
  | "refused"
  | "cancelled"
  | "overtime"
  | "missing_checkout"
  | "manual_edit"
  | "absent"
  | "error"
  | "late"
  | "computed"
  | "validated"
  | "sent"
  | "info"
  | "duplicate_warning";

const styles: Record<Status, string> = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  paid: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  present: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  pending: "bg-amber-50 text-amber-800 border border-amber-200/80",
  warning: "bg-amber-50 text-amber-800 border border-amber-200/80",
  processing: "bg-purple-50 text-purple-700 border border-purple-200/80",
  draft: "bg-stone-100 text-stone-600 border border-stone-200",
  inactive: "bg-stone-100 text-stone-600 border border-stone-200",
  on_leave: "bg-amber-50 text-amber-800 border border-amber-200/80",
  expired: "bg-rose-50 text-rose-700 border border-rose-200/80",
  terminated: "bg-rose-50 text-rose-700 border border-rose-200/80",
  refused: "bg-rose-50 text-rose-700 border border-rose-200/80",
  cancelled: "bg-stone-100 text-stone-600 border border-stone-200",
  overtime: "bg-blue-50 text-blue-700 border border-blue-200/80",
  missing_checkout: "bg-amber-50 text-amber-800 border border-amber-200/80",
  manual_edit: "bg-purple-50 text-purple-700 border border-purple-200/80",
  absent: "bg-rose-50 text-rose-700 border border-rose-200/80",
  error: "bg-rose-50 text-rose-700 border border-rose-200/80",
  late: "bg-amber-50 text-amber-800 border border-amber-200/80",
  computed: "bg-purple-50 text-purple-700 border border-purple-200/80",
  validated: "bg-teal-50 text-teal-700 border border-teal-200/80",
  sent: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  info: "bg-blue-50 text-blue-700 border border-blue-200/80",
  duplicate_warning:
    "bg-amber-50 text-amber-800 border border-amber-200/80",
};

const labelMap: Partial<Record<Status, string>> = {
  on_leave: "On Leave",
  missing_checkout: "Missing Checkout",
  manual_edit: "Manual Edit",
};

export function StatusBadge({ status }: { status?: string | null }) {
  const normalized = (status ? String(status).toLowerCase().replace(/-/g, "_") : "active") as Status;
  const displayLabel = status
    ? labelMap[normalized] || String(status).replace(/_/g, " ")
    : "Active";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        styles[normalized] || "bg-stone-100 text-stone-600 border border-stone-200",
      )}
    >
      {displayLabel}
    </span>
  );
}
