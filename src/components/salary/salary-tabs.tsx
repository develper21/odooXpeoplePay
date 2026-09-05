"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess } from "@/lib/permissions";

export function SalaryTabs() {
  const pathname = usePathname();
  const { user } = useAuth();

  const canViewStructures = user ? canAccess(user.role, "salary_structure.read") : false;
  const canViewRules = user ? canAccess(user.role, "salary_rule.read") : false;

  const tabs = [
    ...(canViewStructures
      ? [{ label: "Salary Structures", href: "/salary-structures", icon: Building2 }]
      : []),
    ...(canViewRules
      ? [{ label: "Salary Rules", href: "/salary-rules", icon: LockKeyhole }]
      : []),
  ];

  if (tabs.length === 0) return null;

  return (
    <div className="mb-6 flex border-b border-border/60">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/salary-structures"
            ? pathname === "/salary-structures" || pathname.startsWith("/salary-structures/")
            : pathname === "/salary-rules" || pathname.startsWith("/salary-rules/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:border-border hover:text-text-secondary"
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
