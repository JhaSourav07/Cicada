"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ModelSelector } from "./ModelSelector";

interface ChatHeaderProps {
  title: string;
  modelName: string;
  onModelChange?: (model: string) => void;
  disabled?: boolean;
}

export function ChatHeader({
  title,
  modelName,
  onModelChange,
  disabled = false,
}: ChatHeaderProps) {
  const [healthStatus, setHealthStatus] = useState<"checking" | "connected" | "disconnected" | "model_missing">("checking");

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/ai/health");
        if (!res.ok) {
          if (isMounted) setHealthStatus("disconnected");
          return;
        }
        const data = await res.json();
        if (isMounted) {
          setHealthStatus(data.status || "connected");
        }
      } catch {
        if (isMounted) setHealthStatus("disconnected");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-surface/50 backdrop-blur-xs px-4 sm:px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-medium tracking-tight text-content-primary truncate max-w-xs sm:max-w-md">
          {title}
        </h1>

        {/* Dynamic Model Selector */}
        {onModelChange ? (
          <ModelSelector
            selectedModel={modelName}
            onModelChange={onModelChange}
            disabled={disabled}
          />
        ) : (
          <Badge variant="outline" className="hidden sm:inline-flex text-[11px] gap-1 font-mono text-content-secondary">
            {modelName}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Live Ollama Health Status */}
        {healthStatus === "connected" && (
          <Badge variant="success" dot className="text-[11px] font-mono">
            <span className="hidden sm:inline">Ollama:</span> Ready
          </Badge>
        )}
        {healthStatus === "disconnected" && (
          <Badge variant="danger" dot className="text-[11px] font-mono">
            <span className="hidden sm:inline">Ollama:</span> Offline
          </Badge>
        )}
        {healthStatus === "model_missing" && (
          <Badge variant="warning" dot className="text-[11px] font-mono">
            <span className="hidden sm:inline">Model:</span> Missing
          </Badge>
        )}
        {healthStatus === "checking" && (
          <Badge variant="outline" className="text-[11px] font-mono text-content-tertiary">
            Checking...
          </Badge>
        )}

        <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] gap-1 font-mono text-content-tertiary border-border-subtle">
          <ShieldCheck className="h-3 w-3 text-success" />
          Localhost
        </Badge>

        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-content-secondary border border-border-subtle font-mono">
          <Sparkles className="h-2.5 w-2.5 text-blue-400" />
          Phase 2
        </span>
      </div>
    </header>
  );
}
