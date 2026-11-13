"use client";

import React, { useEffect, useState, useRef } from "react";
import { Cpu, ChevronDown, Check, RefreshCw, AlertCircle } from "lucide-react";
import { OllamaModelInfo } from "@/lib/ai/ollama";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/models");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setModels(data.models || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-surface-elevated px-2.5 py-1 text-xs font-mono text-content-primary border border-border-subtle hover:border-border-strong hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-focus disabled:opacity-50",
          isOpen && "border-border-strong bg-surface-hover"
        )}
      >
        <Cpu className="h-3.5 w-3.5 text-content-tertiary" />
        <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
          {selectedModel}
        </span>
        <ChevronDown className={cn("h-3 w-3 text-content-tertiary transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-lg border border-border-strong bg-surface-elevated p-1.5 shadow-xl shadow-black/80 animate-in fade-in-0 zoom-in-95 select-none">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-subtle mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-content-tertiary">
              Installed Models
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fetchModels();
              }}
              title="Refresh installed models"
              className="text-content-tertiary hover:text-content-primary p-0.5 rounded transition-colors"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 p-2 text-[11px] text-danger bg-danger-subtle/20 rounded">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {models.length === 0 && !error ? (
            <div className="p-3 text-center text-xs text-content-tertiary">
              {isLoading ? "Checking Ollama..." : "No models detected"}
            </div>
          ) : (
            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {models.map((model) => {
                const isSelected = model.name === selectedModel;
                return (
                  <button
                    key={model.name}
                    type="button"
                    onClick={() => {
                      onModelChange(model.name);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs transition-colors text-left font-mono",
                      isSelected
                        ? "bg-surface-active text-content-primary font-medium border border-border-subtle"
                        : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-content-primary font-medium">{model.name}</span>
                      <span className="text-[10px] text-content-tertiary font-sans">
                        {model.parameterSize ? `${model.parameterSize} params` : ""} • {model.sizeFormatted}
                      </span>
                    </div>

                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
