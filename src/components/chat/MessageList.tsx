"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Message } from "@/types/chat";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/Button";

interface MessageListProps {
  messages: Message[];
  modelName?: string;
  isGenerating?: boolean;
  onSelectPrompt: (prompt: string) => void;
  onRegenerate?: () => void;
}

export function MessageList({
  messages,
  modelName,
  isGenerating = false,
  onSelectPrompt,
  onRegenerate,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    setShowScrollBottom(!isAtBottom);
  };

  if (messages.length === 0) {
    return <EmptyState onSelectPrompt={onSelectPrompt} />;
  }

  // Find the index of the latest assistant message
  let latestAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      latestAssistantIndex = i;
      break;
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-4 space-y-2 relative"
    >
      {messages.map((message, index) => {
        if (message.role === "user") {
          return <UserMessage key={message.id} message={message} />;
        }
        return (
          <AssistantMessage
            key={message.id}
            message={message}
            modelName={modelName}
            isLatestAssistant={index === latestAssistantIndex}
            isGenerating={isGenerating && index === latestAssistantIndex}
            onRegenerate={onRegenerate}
          />
        );
      })}
      <div ref={bottomRef} className="h-2" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <div className="sticky bottom-4 flex justify-center pointer-events-none">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto shadow-lg bg-surface-elevated/95 border-border-strong text-xs gap-1.5 backdrop-blur-xs text-content-primary"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Scroll to bottom</span>
          </Button>
        </div>
      )}
    </div>
  );
}
