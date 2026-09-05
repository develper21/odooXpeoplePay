import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return <button ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm", { "bg-primary text-white hover:bg-blue-500": variant === "primary", "border bg-surface-raised text-foreground hover:bg-surface-soft": variant === "secondary", "text-text-secondary hover:bg-surface-raised hover:text-foreground": variant === "ghost", "bg-danger text-white hover:bg-red-500": variant === "danger" }, className)} {...props} />;
});
