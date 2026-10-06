import * as React from "react";
import { cn } from "@/lib/utils";

const NO_UPPER_TYPES = new Set(["number", "date", "datetime-local", "time", "month", "week", "range", "color", "file", "password", "email", "url"]);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, onChange, type, ...props }, ref) => {
    const shouldUpper = !NO_UPPER_TYPES.has(type ?? "text");

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (shouldUpper) e.target.value = e.target.value.toUpperCase();
      onChange?.(e);
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20",
          shouldUpper && "uppercase",
          className,
        )}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
