"use client";

import React, { useState } from "react";
import { Copy, Check, User } from "lucide-react";
import { Message } from "@/types/chat";

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignore
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="group relative flex justify-end px-4 sm:px-6 py-2.5">
      <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] space-y-1">
        <div className="flex items-center gap-2 text-[10px] text-content-tertiary px-1">
          <span>{formattedTime}</span>
          <div className="flex items-center gap-1 font-medium text-content-secondary">
            <span>You</span>
            <div className="h-4 w-4 rounded-full bg-surface-elevated flex items-center justify-center text-content-secondary border border-border-subtle">
              <User className="h-2.5 w-2.5" />
            </div>
          </div>
        </div>

        {/* Message Bubble */}
        <div className="relative rounded-lg rounded-tr-xs bg-surface-elevated border border-border-strong px-4 py-2.5 text-sm text-content-primary shadow-xs leading-relaxed whitespace-pre-wrap break-words">
          {message.content}

          {/* Floating Copy Action on Hover */}
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy message"}
            className="absolute -left-8 top-2 p-1 rounded bg-surface border border-border-subtle text-content-tertiary hover:text-content-primary opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Copy message"
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
