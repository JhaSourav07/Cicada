"use client";

import React from "react";
import { ChatShell } from "@/components/chat/ChatShell";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { useConversationStore } from "@/lib/useConversationStore";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export default function HomePage() {
  const {
    conversations,
    activeConversation,
    activeId,
    activeMessages,
    composerValue,
    setComposerValue,
    isSettingsOpen,
    openSettings,
    closeSettings,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
    handleSelectStarterPrompt,
  } = useConversationStore();

  return (
    <>
      <ChatShell
        sidebar={
          <AppSidebar
            conversations={conversations}
            activeId={activeId}
            onNewChat={() => createConversation()}
            onSelectChat={selectConversation}
            onRenameChat={renameConversation}
            onDeleteChat={deleteConversation}
            onOpenSettings={openSettings}
          />
        }
      >
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            messages={activeMessages}
            composerValue={composerValue}
            onComposerChange={setComposerValue}
            onSendMessage={sendMessage}
            onSelectPrompt={handleSelectStarterPrompt}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <h2 className="text-base font-semibold text-content-primary">No Active Conversation</h2>
            <p className="mt-1 text-xs text-content-secondary max-w-sm">
              Select an existing conversation from the sidebar or start a new session.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => createConversation()}
              className="mt-4 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Conversation</span>
            </Button>
          </div>
        )}
      </ChatShell>

      <SettingsPanel isOpen={isSettingsOpen} onClose={closeSettings} />
    </>
  );
}
