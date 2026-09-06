import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  busy?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      busy = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || busy}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
          {
            "bg-[#4a1d54] text-white hover:bg-[#3b1444] shadow-sm active:translate-y-px":
              variant === "primary",
            "border border-border bg-surface text-foreground hover:bg-surface-raised hover:border-primary/30 active:translate-y-px":
              variant === "secondary",
            "text-text-secondary hover:bg-surface-raised hover:text-foreground shadow-none":
              variant === "ghost",
            "bg-danger text-white hover:bg-red-700 shadow-sm active:translate-y-px":
              variant === "danger",
          },
          className,
        )}
        {...props}
      >
        {busy && (
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);
