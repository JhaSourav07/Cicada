"use client";

import React from "react";
import { Conversation } from "@/types/chat";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  searchQuery: string;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  searchQuery,
  onSelect,
  onRename,
  onDelete,
}: ConversationListProps) {
  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-medium tracking-wider text-content-tertiary uppercase">
        <span>Recent Chats</span>
        <span className="font-mono text-[10px]">{filtered.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 px-3 text-center">
          <p className="text-xs text-content-tertiary">
            {searchQuery ? "No matching conversations" : "No conversations yet"}
          </p>
        </div>
      ) : (
        filtered.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeId}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}
