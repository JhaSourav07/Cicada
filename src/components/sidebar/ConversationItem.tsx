"use client";

import React, { useState } from "react";
import { MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { Conversation } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ConversationItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && renameValue !== conversation.title) {
      onRename(conversation.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(conversation.title);
    setIsRenaming(false);
  };

  const handleDeleteConfirm = () => {
    onDelete(conversation.id);
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(conversation.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelect(conversation.id);
          }
        }}
        className={cn(
          "group relative flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors duration-150 ease-out cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-accent-focus",
          isActive
            ? "bg-surface-elevated text-content-primary font-medium border border-border-strong shadow-xs"
            : "text-content-secondary hover:bg-surface-hover hover:text-content-primary border border-transparent"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          <MessageSquare
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0 transition-opacity",
              isActive ? "text-content-primary" : "text-content-tertiary group-hover:text-content-secondary"
            )}
          />
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                className="w-full bg-surface-active px-1.5 py-0.5 rounded text-xs text-content-primary border border-border-strong outline-none focus:border-accent-focus"
              />
              <button
                type="submit"
                className="text-success hover:text-success/80 p-0.5"
                aria-label="Confirm rename"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleCancelRename}
                className="text-content-tertiary hover:text-content-secondary p-0.5"
                aria-label="Cancel rename"
              >
                <X className="h-3 w-3" />
              </button>
            </form>
          ) : (
            <span className="truncate leading-normal select-none">{conversation.title}</span>
          )}
        </div>

        {/* Hover Action Menu */}
        {!isRenaming && (
          <div
            className={cn(
              "flex items-center gap-0.5 transition-opacity duration-150",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setRenameValue(conversation.title);
                setIsRenaming(true);
              }}
              title="Rename conversation"
              className="p-1 rounded text-content-tertiary hover:text-content-primary hover:bg-surface-active transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Delete conversation"
              className="p-1 rounded text-content-tertiary hover:text-danger hover:bg-danger-subtle transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
      >
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
