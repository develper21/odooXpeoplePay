import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function SmartButton({ href, icon: Icon, label, count }: { href: string; icon: LucideIcon; label: string; count: number }) { return <Link href={href} className="flex min-w-32 items-center gap-3 rounded-md border bg-surface-raised px-4 py-3 transition-colors hover:border-primary/60 hover:bg-surface-soft"><span className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span><span><span className="block text-lg font-bold leading-none">{count}</span><span className="mt-1 block text-[10px] uppercase tracking-wider text-text-muted">{label}</span></span></Link>; }
