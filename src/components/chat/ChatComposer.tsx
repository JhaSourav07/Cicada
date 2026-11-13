"use client";

import React, { useRef, useEffect } from "react";
import { ArrowUp, CornerDownLeft, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChatComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  modelName?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating = false,
  disabled = false,
  modelName = "qwen3.5:9b",
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit text up to 180px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating && onStop) {
        onStop();
      } else if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const charCount = value.length;
  const maxChars = 8000;

  return (
    <div className="border-t border-border-subtle bg-surface/40 p-3 sm:p-4 flex-shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Main Textarea Container */}
        <div className="relative rounded-lg border border-border-subtle bg-surface-elevated transition-colors duration-150 focus-within:border-border-strong focus-within:ring-1 focus-within:ring-accent-focus">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGenerating
                ? "Generating response... Click Stop or press Enter to interrupt."
                : "Type a message... (Shift + Enter for new line)"
            }
            disabled={disabled}
            maxLength={maxChars}
            className="w-full resize-none bg-transparent px-3.5 py-3 text-sm text-content-primary placeholder:text-content-tertiary outline-none min-h-[44px] max-h-[180px] leading-relaxed"
          />

          {/* Action Row Inside Textarea Box */}
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-content-tertiary">
              <span className="hidden sm:inline-flex items-center gap-1 font-mono">
                <CornerDownLeft className="h-3 w-3" /> {isGenerating ? "Enter to stop" : "Enter to send"}
              </span>
              {charCount > 500 && (
                <span className="font-mono text-[10px]">
                  {charCount}/{maxChars}
                </span>
              )}
            </div>

            {isGenerating ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={onStop}
                title="Stop generation"
                className="h-7 px-2.5 rounded-md gap-1.5 text-xs font-medium"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="icon-sm"
                disabled={!value.trim() || disabled}
                onClick={onSend}
                title="Send message"
                className="h-7 w-7 rounded-md bg-content-primary text-canvas hover:bg-white disabled:bg-surface-active disabled:text-content-tertiary transition-colors"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Status / Model Subtitle */}
        <div className="flex items-center justify-between px-1 text-[11px] text-content-tertiary">
          <span>
            {isGenerating ? "Generating live tokens via Ollama..." : "Private on-device inference (127.0.0.1:11434)"}
          </span>
          <span className="font-mono">{modelName}</span>
        </div>
      </div>
    </div>
  );
}
