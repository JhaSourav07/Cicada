"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, RefreshCw, AlertCircle, Ban, Globe } from "lucide-react";
import { Message } from "@/types/chat";
import { Badge } from "@/components/ui/Badge";
import { CitationBadgeList } from "./CitationBadge";
import { cn } from "@/lib/utils";

interface AssistantMessageProps {
  message: Message;
  modelName?: string;
  isLatestAssistant?: boolean;
  isGenerating?: boolean;
  onRegenerate?: () => void;
}

export function AssistantMessage({
  message,
  modelName = "qwen3.5:9b",
  isLatestAssistant = false,
  isGenerating = false,
  onRegenerate,
}: AssistantMessageProps) {
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

  const isStreaming = message.status === "sending";
  const isInterrupted = message.status === "interrupted";
  const isError = message.status === "error";

  // Replaces [1], [2] citation markers with interactive clickable source badges
  const renderTextWithCitations = (text: string) => {
    if (!message.sources || message.sources.length === 0) {
      return text;
    }

    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const id = match[1];
        const source = message.sources?.find((s) => s.id === id);
        if (source) {
          return (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${source.title} (${source.domain})`}
              className="inline-flex items-center justify-center px-1 py-0.2 mx-0.5 text-[10px] font-mono font-medium rounded bg-accent/15 text-accent hover:bg-accent/25 hover:underline cursor-pointer align-baseline"
            >
              {id}
            </a>
          );
        }
      }
      return part;
    });
  };

  // Simple, robust markdown code fence parser
  const renderFormattedContent = (content: string) => {
    if (!content && isStreaming) {
      return (
        <div className="flex items-center gap-2 text-xs text-content-tertiary py-1 font-mono">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-ping" />
          <span>Generating response from local GPU...</span>
        </div>
      );
    }

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

      // Inline formatting with interactive citations
      return (
        <span key={index} className="whitespace-pre-wrap leading-relaxed">
          {renderTextWithCitations(part)}
        </span>
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
            {modelName}
          </Badge>

          {message.searchMetadata?.searched && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 border-accent/40 text-accent font-mono gap-1">
              <Globe className="h-2.5 w-2.5" />
              Web
            </Badge>
          )}

          {isStreaming && (
            <Badge variant="secondary" dot className="text-[10px] py-0 px-1 border-border-subtle text-blue-400">
              Streaming
            </Badge>
          )}

          {isInterrupted && (
            <Badge variant="warning" className="text-[10px] py-0 px-1 gap-1">
              <Ban className="h-2.5 w-2.5" />
              Stopped
            </Badge>
          )}

          {isError && (
            <Badge variant="danger" className="text-[10px] py-0 px-1 gap-1">
              <AlertCircle className="h-2.5 w-2.5" />
              Error
            </Badge>
          )}

          <span>{formattedTime}</span>
        </div>

        {/* Assistant Content Box */}
        <div
          className={cn(
            "w-full rounded-lg rounded-tl-xs border p-4 text-sm text-content-primary shadow-xs transition-colors",
            isError
              ? "bg-danger-subtle/20 border-danger/40 text-danger-300"
              : "bg-surface border-border-subtle"
          )}
        >
          <div className="space-y-2">
            {renderFormattedContent(message.content)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-content-primary animate-pulse ml-0.5 align-middle" />
            )}
          </div>

          {/* Retrieved Web Citations */}
          {message.sources && message.sources.length > 0 && (
            <CitationBadgeList sources={message.sources} />
          )}

          {/* Action Toolbar */}
          {!isStreaming && (
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

                {isLatestAssistant && onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    title="Regenerate this response with local Ollama"
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-content-secondary hover:text-content-primary hover:bg-surface-elevated disabled:opacity-40 transition-colors text-xs"
                  >
                    <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>

              <span className="text-[10px] font-mono text-content-tertiary">
                127.0.0.1:11434 (100% GPU)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
