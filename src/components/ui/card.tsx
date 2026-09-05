import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) { return <section className={cn("rounded-lg border bg-surface", className)}>{children}</section>; }
export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) { return <div className={cn("flex items-center justify-between border-b px-5 py-4", className)}>{children}</div>; }
export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) { return <h2 className={cn("text-sm font-semibold text-foreground", className)}>{children}</h2>; }
export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) { return <div className={cn("p-5", className)}>{children}</div>; }
