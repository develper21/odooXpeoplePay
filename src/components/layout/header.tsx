"use client";

import Link from "next/link";
import {
  Bell,
  Calendar,
  CheckCheck,
  ChevronDown,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabels } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: "payroll" | "leave" | "attendance" | "contract";
  href: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Payroll Disbursed",
    message:
      "August 2026 payroll successfully processed and validated for all eligible staff.",
    time: "2 hours ago",
    unread: true,
    type: "payroll",
    href: "/payslips",
  },
  {
    id: "notif-2",
    title: "Leave Allocation Approved",
    message:
      "Annual and casual leave quotas have been approved for this calendar year.",
    time: "4 hours ago",
    unread: true,
    type: "leave",
    href: "/time-off/allocations",
  },
  {
    id: "notif-3",
    title: "Attendance Logged",
    message: "Daily biometric check-in recorded today. Schedule hours active.",
    time: "Today, 09:18 AM",
    unread: true,
    type: "attendance",
    href: "/attendance",
  },
  {
    id: "notif-4",
    title: "Active Contract In Place",
    message: "Employment contract terms validated with salary structure linkage.",
    time: "Yesterday",
    unread: false,
    type: "contract",
    href: "/contracts",
  },
];

const searchableItems = [
  {
    label: "Dashboard",
    category: "Navigation",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: "home overview kpi stats",
  },
  {
    label: "Employees",
    category: "HR & Operations",
    href: "/employees",
    icon: Users,
    keywords: "staff directory workforce team",
  },
  {
    label: "New Employee",
    category: "Quick Action",
    href: "/employees/new",
    icon: Plus,
    keywords: "add create onboard hire",
  },
  {
    label: "Contracts",
    category: "HR & Operations",
    href: "/contracts",
    icon: FileText,
    keywords: "employment wage salary agreement",
  },
  {
    label: "Attendance",
    category: "HR & Operations",
    href: "/attendance",
    icon: Clock,
    keywords: "clock in clock out checkin overtime",
  },
  {
    label: "Working Schedules",
    category: "HR & Operations",
    href: "/schedules",
    icon: Calendar,
    keywords: "shifts timetable calendar",
  },
  {
    label: "Time Off Overview",
    category: "Time Off",
    href: "/time-off",
    icon: Calendar,
    keywords: "leaves balance vacation holiday",
  },
  {
    label: "Time Off Requests",
    category: "Time Off",
    href: "/time-off/requests",
    icon: Layers,
    keywords: "leave request apply vacation",
  },
  {
    label: "Request Time Off",
    category: "Quick Action",
    href: "/time-off/requests/new",
    icon: Plus,
    keywords: "apply leave new request",
  },
  {
    label: "Leave Allocations",
    category: "Time Off",
    href: "/time-off/allocations",
    icon: Layers,
    keywords: "quotas entitled days balance",
  },
  {
    label: "Payruns",
    category: "Payroll",
    href: "/payroll",
    icon: Wallet,
    keywords: "payroll processing salary cycle",
  },
  {
    label: "Create Payrun",
    category: "Quick Action",
    href: "/payroll/new",
    icon: Plus,
    keywords: "new payroll execute run",
  },
  {
    label: "Payslips",
    category: "Payroll",
    href: "/payslips",
    icon: FileSpreadsheet,
    keywords: "salary slip statement wage tax deduction net",
  },
  {
    label: "Salary Structures",
    category: "Payroll",
    href: "/salary-structures",
    icon: Layers,
    keywords: "compensation salary template package",
  },
  {
    label: "Salary Rules",
    category: "Payroll",
    href: "/salary-rules",
    icon: Settings,
    keywords: "basic hra pf tax gross net formula",
  },
  {
    label: "User Management",
    category: "Administration",
    href: "/users",
    icon: UserCheck,
    keywords: "accounts credentials access",
  },
  {
    label: "Roles & Permissions",
    category: "Administration",
    href: "/roles",
    icon: ShieldCheck,
    keywords: "rbac access security privileges",
  },
];

export function Header({ onMenu }: { onMenu: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const router = useRouter();
  const { user, logout } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markItemAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
  };

  // Keyboard shortcut listener: Cmd+K / Ctrl+K opens search, Escape closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [searchOpen]);

  const filteredSearch = useMemo(() => {
    if (!searchQuery.trim()) return searchableItems;
    const q = searchQuery.toLowerCase().trim();
    return searchableItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleSelectSearchResult = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="rounded-md p-2 text-text-secondary hover:bg-surface-raised lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>

          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-2.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-text-muted hover:border-primary/50 hover:text-foreground transition-all shadow-xs sm:flex"
            aria-label="Open quick search"
          >
            <Search className="size-3.5 text-primary" />
            <span>Search anything...</span>
            <kbd className="ml-2 rounded border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
              ⌘ K
            </kbd>
          </button>

          {/* Mobile Search Icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-full p-2 text-text-secondary hover:bg-surface-raised sm:hidden"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              className="relative rounded-full p-2 text-text-secondary hover:bg-surface-raised hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white ring-2 ring-background">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-surface shadow-2xl animate-rise-in overflow-hidden">
                <div className="flex items-center justify-between border-b border-border p-3.5 bg-surface-raised/40">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <CheckCheck className="size-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[340px] divide-y divide-border/60 overflow-y-auto no-scrollbar">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markItemAsRead(notif.id);
                        setNotifOpen(false);
                        router.push(notif.href);
                      }}
                      className={cn(
                        "flex cursor-pointer gap-3 p-3.5 transition-colors hover:bg-surface-raised/80",
                        notif.unread && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          notif.type === "payroll" &&
                            "bg-emerald-100 text-emerald-700",
                          notif.type === "leave" &&
                            "bg-purple-100 text-purple-700",
                          notif.type === "attendance" &&
                            "bg-amber-100 text-amber-800",
                          notif.type === "contract" &&
                            "bg-blue-100 text-blue-700",
                        )}
                      >
                        {notif.type === "payroll" && (
                          <Wallet className="size-4" />
                        )}
                        {notif.type === "leave" && (
                          <Calendar className="size-4" />
                        )}
                        {notif.type === "attendance" && (
                          <Clock className="size-4" />
                        )}
                        {notif.type === "contract" && (
                          <FileText className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {notif.title}
                          </p>
                          {notif.unread && (
                            <span className="size-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="mt-1 text-[10px] text-text-muted/80">
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border p-2.5 text-center bg-surface-raised/20">
                  <Link
                    href="/dashboard"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View Operational Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-full p-1 hover:bg-surface-raised transition-colors"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-[#e89938] text-xs font-bold text-white shadow-sm">
                  {user.initials || "AM"}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-xs font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="block text-[10px] text-text-muted">
                    {roleLabels[user.role]}
                  </span>
                </span>
                <ChevronDown className="size-3 text-text-muted" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-border bg-surface p-2 shadow-2xl animate-rise-in">
                  <div className="border-b border-border px-3 pb-2.5 pt-1">
                    <p className="text-xs font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted truncate">
                      {user.email}
                    </p>
                    <span className="mt-1.5 inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {roleLabels[user.role]}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/employees"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised hover:text-foreground transition-colors"
                    >
                      <Users className="size-3.5" /> My Profile
                    </Link>
                    <Link
                      href="/payslips"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised hover:text-foreground transition-colors"
                    >
                      <Wallet className="size-3.5" /> My Payslips
                    </Link>
                    {user.role === "ADMIN" && (
                      <>
                        <Link
                          href="/users"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised hover:text-foreground transition-colors"
                        >
                          <UserCheck className="size-3.5" /> User Management
                        </Link>
                        <Link
                          href="/roles"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised hover:text-foreground transition-colors"
                        >
                          <ShieldCheck className="size-3.5" /> Roles &
                          Permissions
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Command Palette Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
          <div
            onClick={() => setSearchOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
          />
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-rise-in">
            {/* Input Header */}
            <div className="flex items-center border-b border-border px-4 py-3 bg-surface-raised/50">
              <Search className="size-4 text-primary shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, payroll, employees, actions..."
                className="w-full bg-transparent px-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-[360px] overflow-y-auto no-scrollbar p-2">
              {filteredSearch.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  No matching pages or actions found for &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredSearch.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href + item.label}
                      onClick={() => handleSelectSearchResult(item.href)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-text-secondary hover:bg-surface-raised hover:text-foreground transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-md bg-surface-raised text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Icon className="size-3.5" />
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {item.category}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-text-muted group-hover:text-primary transition-colors">
                        Jump to →
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border bg-surface-raised/30 px-4 py-2 text-[11px] text-text-muted">
              <span>Navigate with mouse or enter key</span>
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]">
                ESC to close
              </kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
