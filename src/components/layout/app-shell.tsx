"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) { const [open, setOpen] = useState(false); return <div className="flex min-h-screen bg-background"><Sidebar open={open} onClose={() => setOpen(false)} /><div className="flex min-w-0 flex-1 flex-col"><Header onMenu={() => setOpen(true)} /><main className="flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1500px] animate-rise-in">{children}</div></main></div></div>; }
