"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleNavigation } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const sections = user ? visibleNavigation(user.role) : [];
  const handleLogout = async () => { await logout(); router.replace("/login"); onClose(); };
  return <><div onClick={onClose} className={cn("fixed inset-0 z-30 bg-black/60 lg:hidden", open ? "block" : "hidden")} /><aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-surface transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}><div className="flex h-16 items-center justify-between border-b px-5"><Link href="/dashboard" className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-black text-white">P</span><span className="text-sm font-bold tracking-[0.18em]">PEOPLEPAY<span className="text-primary">360</span></span></Link><button onClick={onClose} className="text-text-muted lg:hidden" aria-label="Close navigation"><X className="size-5" /></button></div><nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">{sections.map((section) => <div key={section.label}><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{section.label}</p><div className="space-y-1">{section.items.map(({ label, href, icon: Icon }) => { const isItemActive = pathname === href || (href !== "/dashboard" && href !== "/time-off" && pathname.startsWith(`${href}/`)); return <Link key={`${section.label}-${href}`} href={href} onClick={onClose} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground", isItemActive && "bg-blue-500/10 font-semibold text-primary")}><Icon className="size-4" />{label}</Link>; })}</div></div>)}</nav><div className="border-t p-4"><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface-raised hover:text-foreground"><LogOut className="size-4" />Sign out</button></div></aside></>;
}
