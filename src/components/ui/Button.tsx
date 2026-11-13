import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-focus disabled:pointer-events-none disabled:opacity-40 select-none";

    const variantStyles = {
      primary:
        "bg-content-primary text-canvas hover:bg-white active:bg-zinc-200 font-medium shadow-sm",
      secondary:
        "bg-surface-elevated text-content-primary hover:bg-surface-hover active:bg-surface-active border border-border-subtle",
      ghost:
        "text-content-secondary hover:text-content-primary hover:bg-surface-hover active:bg-surface-active",
      danger:
        "bg-danger-subtle text-danger hover:bg-danger/20 active:bg-danger/30 border border-danger/30",
      outline:
        "border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-surface-hover active:bg-surface-active",
    };

    const sizeStyles = {
      sm: "h-7 px-2.5 text-xs gap-1.5",
      md: "h-8 px-3 text-sm gap-2",
      lg: "h-10 px-4 text-sm gap-2",
      icon: "h-8 w-8 p-1.5",
      "icon-sm": "h-6 w-6 p-1 text-xs",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
