"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 w-full max-w-md rounded-lg border border-border-strong bg-surface-elevated p-5 shadow-2xl shadow-black/80 transition-all duration-150 animate-in fade-in-0 zoom-in-95",
          className
        )}
      >
        <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
          <div>
            <h2 id="modal-title" className="text-sm font-semibold text-content-primary tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-content-secondary leading-normal">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-content-tertiary hover:text-content-primary -mr-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
