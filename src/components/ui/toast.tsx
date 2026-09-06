"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  message,
  type = "success",
  title,
  duration = 4500,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onClose?.();
  };

  const getStyle = () => {
    switch (type) {
      case "error":
        return {
          border: "border-red-500/30 bg-white/95 text-red-950 dark:bg-zinc-900/95 dark:text-red-100",
          iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
          icon: <AlertCircle className="size-4 shrink-0 text-red-500" />,
        };
      case "warning":
        return {
          border: "border-amber-500/30 bg-white/95 text-amber-950 dark:bg-zinc-900/95 dark:text-amber-100",
          iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          icon: <AlertTriangle className="size-4 shrink-0 text-amber-500" />,
        };
      case "info":
        return {
          border: "border-blue-500/30 bg-white/95 text-blue-950 dark:bg-zinc-900/95 dark:text-blue-100",
          iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          icon: <Info className="size-4 shrink-0 text-blue-500" />,
        };
      case "success":
      default:
        return {
          border: "border-emerald-500/30 bg-white/95 text-emerald-950 dark:bg-zinc-900/95 dark:text-emerald-100",
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          icon: <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />,
        };
    }
  };

  const currentStyle = getStyle();

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 right-5 z-[99999] pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 sm:top-6 sm:right-6"
      style={{
        animation: "slideDownFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${currentStyle.iconBg}`}
      >
        {currentStyle.icon}
      </div>

      <div className="flex-1 text-xs sm:text-sm">
        {title && <p className="font-bold leading-tight">{title}</p>}
        <p className="font-medium text-text-primary leading-snug">{message}</p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md p-0.5 text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
