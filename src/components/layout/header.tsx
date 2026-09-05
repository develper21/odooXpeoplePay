"use client";

import Link from "next/link";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabels } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export function Header({ onMenu }: { onMenu: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-surface px-4 sm:px-6">
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

      <div className="flex items-center gap-2">
        <button
          className="hidden items-center gap-2 rounded-md border bg-surface-raised px-3 py-2 text-xs text-text-muted sm:flex"
        >
          <Search className="size-3.5" />
          Search <kbd className="ml-4 rounded border px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
        </button>

        <button
          className="relative rounded-md p-2 text-text-secondary hover:bg-surface-raised"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
        </button>

        {user && (
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-md p-1.5 hover:bg-surface-raised"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-primary">
                {user.initials}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-xs font-semibold">{user.name}</span>
                <span className="block text-[10px] text-text-muted">{roleLabels[user.role]}</span>
              </span>
              <ChevronDown className="size-3 text-text-muted" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 z-20 w-56 rounded-md border bg-surface p-2 shadow-xl">
                <div className="border-b px-3 pb-2">
                  <p className="text-xs font-semibold">{user.name}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{user.email}</p>
                  <p className="mt-1 text-[11px] font-semibold text-primary">{roleLabels[user.role]}</p>
                </div>
                <Link
                  href="/employees"
                  onClick={() => setProfileOpen(false)}
                  className="mt-1 block rounded px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised"
                >
                  My Profile
                </Link>
                {user.role === "ADMIN" && (
                  <>
                    <Link
                      href="/users"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised"
                    >
                      User Management
                    </Link>
                    <Link
                      href="/roles"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised"
                    >
                      Roles & Permissions
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="block rounded px-3 py-2 text-xs text-text-secondary hover:bg-surface-raised"
                    >
                      Settings
                    </Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full rounded px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-raised"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
