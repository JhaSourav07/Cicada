"use client";

import React from "react";
import { Conversation, Message } from "@/types/chat";
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

      {/* Composer Input Area */}
      <ChatComposer
        value={composerValue}
        onChange={onComposerChange}
        onSend={onSendMessage}
        onStop={onStopGeneration}
        isGenerating={isGenerating}
        modelName={conversation.model}
      />
    </div>
  );
}
