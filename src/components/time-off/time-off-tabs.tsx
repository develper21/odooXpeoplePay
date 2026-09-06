"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarDays, Layers, ListFilter, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";

export function TimeOffTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  const canManage = user ? canAccess(user.role, "timeoff.approve") : false;

  const tabs = [
    { label: "Overview", href: "/time-off", icon: CalendarDays },
    { label: "Requests", href: "/time-off/requests", icon: ListFilter },
    { label: "Allocations", href: "/time-off/allocations", icon: Layers },
    ...(canManage
      ? [
          {
            label: "Time Off Types",
            href: "/time-off/types",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <div className="mb-6 flex border-b border-border/60">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/time-off"
            ? pathname === "/time-off"
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:border-border hover:text-text-secondary",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
