import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-surface-elevated text-content-primary border-border-subtle",
    secondary: "bg-surface text-content-secondary border-border-subtle",
    outline: "bg-transparent text-content-secondary border-border-subtle",
    success: "bg-success-subtle text-success border-success/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    danger: "bg-danger-subtle text-danger border-danger/30",
  };

  const dotColors = {
    default: "bg-content-secondary",
    secondary: "bg-content-tertiary",
    outline: "bg-content-secondary",
    success: "bg-success",
    warning: "bg-amber-400",
    danger: "bg-danger",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium tracking-tight select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
