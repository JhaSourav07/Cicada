import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", icon, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-2.5 text-content-tertiary pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full rounded-md bg-surface border border-border-subtle px-3 py-1.5 text-sm text-content-primary placeholder:text-content-tertiary transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:border-border-strong focus-visible:ring-1 focus-visible:ring-accent-focus disabled:cursor-not-allowed disabled:opacity-40",
            icon && "pl-8",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
