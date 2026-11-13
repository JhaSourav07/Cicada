"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, RefreshCw } from "lucide-react";
import { Message } from "@/types/chat";
import { Badge } from "@/components/ui/Badge";

interface AssistantMessageProps {
  message: Message;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);

  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBlockIndex(index);
      setTimeout(() => setCopiedBlockIndex(null), 2000);
    } catch {
      // Fallback
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Simple, robust markdown code fence parser
  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        // Code Block
        const lines = part.slice(3, -3).trim().split("\n");
        const language = lines[0].trim().match(/^[a-zA-Z0-9_-]+$/) ? lines[0].trim() : "plaintext";
        const code = lines[0].trim().match(/^[a-zA-Z0-9_-]+$/) ? lines.slice(1).join("\n") : lines.join("\n");

        return (
          <div
            key={index}
            className="my-3 rounded-lg border border-border-strong bg-[#0d0e11] overflow-hidden text-xs font-mono"
          >
            <div className="flex items-center justify-between border-b border-border-subtle bg-surface-elevated/80 px-3 py-1.5 text-content-tertiary">
              <span className="text-[11px] font-medium uppercase tracking-wider">{language}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(code, index)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
              >
                {copiedBlockIndex === index ? (
                  <>
                    <Check className="h-3 w-3 text-success" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto leading-relaxed text-content-primary">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Inline formatting (paragraphs, lists, inline code)
      return (
        <div key={index} className="space-y-2 whitespace-pre-wrap leading-relaxed">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="group flex justify-start px-4 sm:px-6 py-2.5">
      <div className="flex flex-col items-start max-w-[90%] sm:max-w-[85%] space-y-1">
        {/* Header Metadata */}
        <div className="flex items-center gap-2 text-[10px] text-content-tertiary px-1">
          <div className="flex items-center gap-1.5 font-medium text-content-primary">
            <div className="h-4 w-4 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-content-primary">
              <Terminal className="h-2.5 w-2.5" />
            </div>
            <span>CICADA</span>
          </div>
          <Badge variant="outline" className="text-[10px] py-0 px-1 border-border-subtle font-mono text-content-tertiary">
            qwen3.5-9b-32k
          </Badge>
          <span>{formattedTime}</span>
        </div>

        {/* Assistant Content Box */}
        <div className="w-full rounded-lg rounded-tl-xs bg-surface border border-border-subtle p-4 text-sm text-content-primary shadow-xs">
          {renderFormattedContent(message.content)}

          {/* Action Toolbar */}
          <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-xs text-content-tertiary">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors text-xs"
              >
                {copiedAll ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                <span>{copiedAll ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                disabled
                title="Regeneration connects with Ollama in Phase 2"
                className="flex items-center gap-1.5 px-2 py-1 rounded text-content-tertiary opacity-50 cursor-not-allowed text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Regenerate (Phase 2)</span>
              </button>
            </div>

            <span className="text-[10px] font-mono text-content-tertiary">
              Ollama / 127.0.0.1:11434
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
