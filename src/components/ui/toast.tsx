"use client";

import { CheckCircle2, X } from "lucide-react";
import { useState } from "react";

export function Toast({ message }: { message: string }) { const [visible, setVisible] = useState(true); if (!visible) return null; return <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-green-500/30 bg-surface px-4 py-3 text-sm shadow-2xl"><CheckCircle2 className="size-4 text-success" />{message}<button onClick={() => setVisible(false)} aria-label="Dismiss notification"><X className="size-4 text-text-muted" /></button></div>; }
