"use client";

import React from "react";
import { Cpu, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface ChatHeaderProps {
  title: string;
  modelName?: string;
}

export function ChatHeader({ title, modelName = "qwen3.5-9b-32k" }: ChatHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-surface/50 backdrop-blur-xs px-4 sm:px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-medium tracking-tight text-content-primary truncate max-w-xs sm:max-w-md">
          {title}
        </h1>
        <Badge variant="outline" className="hidden sm:inline-flex text-[11px] gap-1 font-mono text-content-secondary">
          <Cpu className="h-3 w-3 text-content-tertiary" />
          {modelName}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[11px] gap-1 font-mono text-content-tertiary border-border-subtle">
          <ShieldCheck className="h-3 w-3 text-success" />
          <span className="hidden sm:inline">Privacy:</span> Localhost
        </Badge>
        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-content-secondary border border-border-subtle font-mono">
          <Sparkles className="h-2.5 w-2.5 text-amber-400" />
          Phase 1
        </span>
      </div>
    </header>
  );
}
