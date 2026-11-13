"use client";

import React from "react";
import { Globe } from "lucide-react";
import { Conversation, Message, SearchMode } from "@/types/chat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatComposer } from "./ChatComposer";

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  composerValue: string;
  isGenerating?: boolean;
  hasOlderMessages?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlderMessages?: () => void;
  onComposerChange: (val: string) => void;
  onSendMessage: () => void;
  onStopGeneration?: () => void;
  onRegenerateResponse?: () => void;
  onModelChange?: (model: string) => void;
  onSelectPrompt: (prompt: string) => void;
  searchMode?: SearchMode;
  onSearchModeChange?: (mode: SearchMode) => void;
  searchStatus?: { isSearching: boolean; query?: string; resultCount?: number };
}

export function ChatWindow({
  conversation,
  messages,
  composerValue,
  isGenerating = false,
  hasOlderMessages = false,
  isLoadingOlder = false,
  onLoadOlderMessages,
  onComposerChange,
  onSendMessage,
  onStopGeneration,
  onRegenerateResponse,
  onModelChange,
  onSelectPrompt,
  searchMode = "auto",
  onSearchModeChange,
  searchStatus,
}: ChatWindowProps) {
  return (
    <div className="flex h-full flex-col bg-canvas overflow-hidden">
      {/* Conversation Header */}
      <ChatHeader
        title={conversation.title}
        modelName={conversation.model}
        onModelChange={onModelChange}
        disabled={isGenerating}
      />

      {/* Message History & Empty State */}
      <MessageList
        messages={messages}
        modelName={conversation.model}
        isGenerating={isGenerating}
        hasOlderMessages={hasOlderMessages}
        isLoadingOlder={isLoadingOlder}
        onLoadOlderMessages={onLoadOlderMessages}
        onSelectPrompt={onSelectPrompt}
        onRegenerate={onRegenerateResponse}
      />

      {/* Active Web Search Status Indicator */}
      {searchStatus?.isSearching && (
        <div className="flex items-center gap-2 px-6 py-2 bg-accent/5 border-t border-border-subtle/50 text-xs text-accent animate-pulse">
          <Globe className="w-3.5 h-3.5 animate-spin" />
          <span>Searching the web{searchStatus.query ? ` for "${searchStatus.query}"` : ""}...</span>
        </div>
      )}

      {/* Composer Input Area */}
      <ChatComposer
        value={composerValue}
        onChange={onComposerChange}
        onSend={onSendMessage}
        onStop={onStopGeneration}
        isGenerating={isGenerating}
        modelName={conversation.model}
        searchMode={searchMode}
        onSearchModeChange={onSearchModeChange}
      />
    </div>
  );
}
