"use client";

import { useState, useCallback, useEffect } from "react";
import { Conversation, Message } from "@/types/chat";

const DEFAULT_MODEL = "qwen3.5-9b-32k";

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-welcome",
    title: "CICADA System Architecture",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    model: DEFAULT_MODEL,
    messageCount: 2,
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  "conv-welcome": [
    {
      id: "msg-1",
      conversationId: "conv-welcome",
      role: "user",
      content: "What is CICADA and how does its architecture guarantee private local inference?",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "msg-2",
      conversationId: "conv-welcome",
      role: "assistant",
      content: `CICADA is a local-first personal AI assistant built for privacy, fast local inference, and developer productivity on Fedora Linux.

### Key Architectural Foundations

1. **Loopback Service Isolation**: All communication occurs on \`127.0.0.1\`. No telemetry or external API keys are used.
2. **Local Model Inference**: Powered by Ollama running \`qwen3.5-9b-32k\` on your dedicated NVIDIA RTX 4060 GPU.
3. **Phase-by-Phase Construction**:
   - **Phase 1**: Frontend & chat architecture.
   - **Phase 2**: Local Ollama SSE streaming integration.
   - **Phase 3**: MongoDB persistence.

\`\`\`bash
# All services bind strictly to localhost:
Next.js UI:    http://127.0.0.1:3000
Ollama LLM:    http://127.0.0.1:11434
MongoDB:       http://127.0.0.1:27017
SearXNG:       http://127.0.0.1:8080
\`\`\`

*Note: Phase 1 provides the client foundation; Phase 2 connects live inference.*`,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

export function useConversationStore() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>("conv-welcome");
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [composerValue, setComposerValue] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const createConversation = useCallback((initialTitle = "New Conversation"): string => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: initialTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: DEFAULT_MODEL,
      messageCount: 0,
    };

    setConversations((prev) => [newConv, ...prev]);
    setMessagesByConv((prev) => ({ ...prev, [newId]: [] }));
    setActiveId(newId);
    setComposerValue("");
    return newId;
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + N for new conversation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createConversation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createConversation]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const renameConversation = useCallback((id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    setMessagesByConv((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, [activeId]);

  const sendMessage = useCallback(() => {
    if (!composerValue.trim()) return;

    let targetId = activeId;
    if (!targetId) {
      targetId = createConversation(
        composerValue.trim().slice(0, 30) + (composerValue.length > 30 ? "..." : "")
      );
    }

    const currentText = composerValue.trim();
    setComposerValue("");

    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: targetId,
      role: "user",
      content: currentText,
      createdAt: now,
      status: "sent",
    };

    // Phase 1 Assistant Response: Inform the user that Phase 1 UI is connected, and Phase 2 will link Ollama
    const assistantNoticeMsg: Message = {
      id: `msg-${Date.now() + 1}`,
      conversationId: targetId,
      role: "assistant",
      content: `[Phase 1 System Notice]
Your message has been captured in client memory.

Local AI inference is **not connected** in Phase 1 (as specified in the architecture roadmap). Live token streaming from your local \`${DEFAULT_MODEL}\` model via Ollama will be connected in **Phase 2**.

Target Endpoint: \`POST /api/chat\` (Phase 2)
Inference Host: \`http://127.0.0.1:11434\` (Ollama)`,
      createdAt: new Date().toISOString(),
      status: "sent",
    };

    setMessagesByConv((prev) => ({
      ...prev,
      [targetId!]: [...(prev[targetId!] || []), userMsg, assistantNoticeMsg],
    }));

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetId) {
          const isFirstMessage = (messagesByConv[targetId!] || []).length === 0;
          return {
            ...c,
            title: isFirstMessage
              ? currentText.slice(0, 32) + (currentText.length > 32 ? "..." : "")
              : c.title,
            updatedAt: now,
            messageCount: (messagesByConv[targetId!] || []).length + 2,
          };
        }
        return c;
      })
    );
  }, [composerValue, activeId, createConversation, messagesByConv]);

  const handleSelectStarterPrompt = useCallback((prompt: string) => {
    setComposerValue(prompt);
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const activeMessages = activeId ? messagesByConv[activeId] || [] : [];

  return {
    conversations,
    activeConversation,
    activeId,
    activeMessages,
    composerValue,
    setComposerValue,
    isSettingsOpen,
    openSettings: () => setIsSettingsOpen(true),
    closeSettings: () => setIsSettingsOpen(false),
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
    handleSelectStarterPrompt,
  };
}
