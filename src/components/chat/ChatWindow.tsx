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
  onComposerChange: (val: string) => void;
  onSendMessage: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export function ChatWindow({
  conversation,
  messages,
  composerValue,
  onComposerChange,
  onSendMessage,
  onSelectPrompt,
}: ChatWindowProps) {
  return (
    <div className="flex h-full flex-col bg-canvas overflow-hidden">
      {/* Conversation Header */}
      <ChatHeader title={conversation.title} modelName={conversation.model} />

      {/* Message History & Empty State */}
      <MessageList messages={messages} onSelectPrompt={onSelectPrompt} />

      {/* Composer Input Area */}
      <ChatComposer
        value={composerValue}
        onChange={onComposerChange}
        onSend={onSendMessage}
      />
    </div>
  );
}
