"use client";

import React, { useState } from "react";
import { Plus, Search, Settings, Terminal, ShieldCheck } from "lucide-react";
import { Conversation } from "@/types/chat";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConversationList } from "./ConversationList";

interface AppSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void;
}

export function AppSidebar({
  conversations,
  activeId,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onOpenSettings,
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-full flex-col bg-surface select-none">
      {/* Brand & Action Header */}
      <div className="p-3 border-b border-border-subtle flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-surface-elevated border border-border-strong text-content-primary">
              <Terminal className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-content-primary">CICADA</span>
              <span className="text-[10px] font-mono text-content-tertiary">local</span>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-mono text-content-tertiary">
            <ShieldCheck className="h-3 w-3 text-success" />
            127.0.0.1
          </span>
        </div>

        {/* New Conversation Trigger */}
        <Button
          variant="secondary"
          size="md"
          onClick={onNewChat}
          className="w-full justify-between bg-surface-elevated hover:bg-surface-hover text-xs font-medium border-border-subtle text-content-primary shadow-xs"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-content-secondary" />
            New Chat
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface text-content-tertiary border border-border-subtle">
            ⌘N
          </kbd>
        </Button>

        {/* Real-time Conversation Filter */}
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            icon={<Search className="h-3.5 w-3.5" />}
            className="h-8 text-xs bg-surface-elevated/60 border-border-subtle focus-visible:bg-surface-elevated"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        searchQuery={searchQuery}
        onSelect={onSelectChat}
        onRename={onRenameChat}
        onDelete={onDeleteChat}
      />

      {/* Sidebar Footer with Diagnostics / Settings */}
      <div className="p-3 border-t border-border-subtle bg-surface">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="w-full justify-between text-xs text-content-secondary hover:text-content-primary hover:bg-surface-hover"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5" />
            Settings & Diagnostics
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="System Ready" />
        </Button>
      </div>
    </div>
  );
}
