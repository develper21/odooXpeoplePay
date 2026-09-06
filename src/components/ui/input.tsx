import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none",
        className,
      )}
      {...props}
    />
  );
});
