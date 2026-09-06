"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleNavigation, roleLabels } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const sections = user ? visibleNavigation(user.role) : [];

  // Track which sections are open (default all open, togglable)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/60 lg:hidden",
          open ? "block" : "hidden",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-shrink-0 flex-col border-r border-[#3a213f] bg-[#28162c] text-[#f5eff7] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#3a213f] px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#e89938] text-sm font-black text-white shadow-md">
              P
            </span>
            <div>
              <span className="block text-sm font-bold tracking-tight text-white">
                PeoplePay360
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-[#a892b0]">
                People Operations
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="text-[#a892b0] hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav list */}
        <nav className="flex-1 space-y-4 overflow-y-auto no-scrollbar px-3 py-4">
          {sections.map((section) => {
            const hasMultiple = section.items.length > 1;
            const isSectionOpen = !collapsed[section.label];

            return (
              <div key={section.label} className="rounded-lg">
                {hasMultiple ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9c84a5] hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-[#9c84a5] transition-transform duration-200",
                        isSectionOpen ? "rotate-0" : "-rotate-90",
                      )}
                    />
                  </button>
                ) : (
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9c84a5]">
                    {section.label}
                  </p>
                )}

                {(!hasMultiple || isSectionOpen) && (
                  <div className="mt-1 space-y-1">
                    {section.items.map(({ label, href, icon: Icon }) => {
                      const isItemActive =
                        pathname === href ||
                        (href !== "/dashboard" &&
                          href !== "/time-off" &&
                          pathname.startsWith(`${href}/`));
                      return (
                        <Link
                          key={`${section.label}-${href}`}
                          href={href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-[#d4c7d9] transition-all",
                            isItemActive
                              ? "bg-[#4e2755] font-semibold text-white shadow-sm ring-1 ring-white/10"
                              : "hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              isItemActive ? "text-white" : "text-[#b29eb9]",
                            )}
                          />
                          <span>{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer User Profile Pill */}
        <div className="border-t border-[#3a213f] p-3">
          {user ? (
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e89938] text-xs font-bold text-white shadow-sm">
                  {user.initials || "AM"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-[10px] text-[#a892b0]">
                    {roleLabels[user.role]}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-[#a892b0] hover:bg-white/10 hover:text-white transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#a892b0] hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
