"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Conversation, Message } from "@/types/chat";
import { consumeSSEStream } from "@/lib/ai/sse-client";

const DEFAULT_MODEL = "qwen3.5:9b";

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
      status: "sent",
    },
    {
      id: "msg-2",
      conversationId: "conv-welcome",
      role: "assistant",
      content: `CICADA is a local-first personal AI assistant built for privacy, fast local inference, and developer productivity on Fedora Linux.

### Key Architectural Foundations

1. **Loopback Service Isolation**: All communication occurs on \`127.0.0.1\`. No telemetry or external API keys are used.
2. **Local Model Inference**: Powered by Ollama running \`qwen3.5:9b\` on your dedicated NVIDIA RTX 4060 GPU with 100% GPU acceleration.
3. **Real-time SSE Streaming**: Direct token streaming from Ollama via Next.js Route Handlers without third-party cloud dependencies.

\`\`\`bash
# Core service endpoints (all bound to 127.0.0.1):
Next.js UI:    http://127.0.0.1:3000
Ollama LLM:    http://127.0.0.1:11434
MongoDB:       http://127.0.0.1:27017 (Phase 3)
SearXNG:       http://127.0.0.1:8080  (Phase 4)
\`\`\``,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      status: "sent",
    },
  ],
};

export function useConversationStore() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>("conv-welcome");
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [composerValue, setComposerValue] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  const abortControllerRef = useRef<AbortController | null>(null);

  const createConversation = useCallback(
    (initialTitle = "New Conversation", model = selectedModel): string => {
      const newId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: newId,
        title: initialTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model,
        messageCount: 0,
      };

      setConversations((prev) => [newConv, ...prev]);
      setMessagesByConv((prev) => ({ ...prev, [newId]: [] }));
      setActiveId(newId);
      setComposerValue("");
      return newId;
    },
    [selectedModel]
  );

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

  const deleteConversation = useCallback(
    (id: string) => {
      if (isGenerating && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsGenerating(false);
      }

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
    },
    [activeId, isGenerating]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    if (!activeId) return;
    setMessagesByConv((prev) => {
      const currentList = prev[activeId] || [];
      if (currentList.length === 0) return prev;
      const lastMsg = currentList[currentList.length - 1];
      if (lastMsg.role === "assistant" && lastMsg.status === "sending") {
        const updatedLast: Message = {
          ...lastMsg,
          status: "interrupted",
          content: lastMsg.content ? `${lastMsg.content}\n\n*[Generation stopped by user]*` : "*[Generation stopped by user]*",
        };
        return {
          ...prev,
          [activeId]: [...currentList.slice(0, -1), updatedLast],
        };
      }
      return prev;
    });
  }, [activeId]);

  const streamFromEndpoint = useCallback(
    async (targetConversationId: string, history: Message[], modelToUse: string) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsGenerating(true);

      const assistantMsgId = `msg-assistant-${Date.now()}`;
      const initialAssistantMessage: Message = {
        id: assistantMsgId,
        conversationId: targetConversationId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      // Add empty assistant placeholder message
      setMessagesByConv((prev) => ({
        ...prev,
        [targetConversationId]: [...(prev[targetConversationId] || []), initialAssistantMessage],
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: targetConversationId,
            model: modelToUse,
            messages: history.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error || `HTTP ${response.status}: Failed to reach chat engine`;

          setMessagesByConv((prev) => {
            const list = prev[targetConversationId] || [];
            return {
              ...prev,
              [targetConversationId]: list.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: `Error: ${errMsg}`, status: "error" as const }
                  : m
              ),
            };
          });
          setIsGenerating(false);
          return;
        }

        if (!response.body) {
          throw new Error("No readable stream in response");
        }

        let accumulatedContent = "";

        await consumeSSEStream(response.body, {
          onToken: (token) => {
            accumulatedContent += token;
            setMessagesByConv((prev) => {
              const list = prev[targetConversationId] || [];
              return {
                ...prev,
                [targetConversationId]: list.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedContent, status: "sending" as const }
                    : m
                ),
              };
            });
          },
          onDone: () => {
            setMessagesByConv((prev) => {
              const list = prev[targetConversationId] || [];
              return {
                ...prev,
                [targetConversationId]: list.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, status: "sent" as const }
                    : m
                ),
              };
            });
            setIsGenerating(false);
          },
          onError: (err) => {
            setMessagesByConv((prev) => {
              const list = prev[targetConversationId] || [];
              return {
                ...prev,
                [targetConversationId]: list.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: accumulatedContent
                          ? `${accumulatedContent}\n\n[Stream error: ${err.message}]`
                          : `[Stream error: ${err.message}]`,
                        status: "error" as const,
                      }
                    : m
                ),
              };
            });
            setIsGenerating(false);
          },
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Handled by stopGeneration
          return;
        }

        const msg = err instanceof Error ? err.message : "Unknown communication failure";
        setMessagesByConv((prev) => {
          const list = prev[targetConversationId] || [];
          return {
            ...prev,
            [targetConversationId]: list.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `Connection error: ${msg}`, status: "error" as const }
                : m
            ),
          };
        });
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const sendMessage = useCallback(() => {
    if (!composerValue.trim() || isGenerating) return;

    let targetId = activeId;
    const currentText = composerValue.trim();
    setComposerValue("");

    if (!targetId) {
      targetId = createConversation(
        currentText.slice(0, 30) + (currentText.length > 30 ? "..." : "")
      );
    }

    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      conversationId: targetId,
      role: "user",
      content: currentText,
      createdAt: now,
      status: "sent",
    };

    const priorMessages = messagesByConv[targetId] || [];
    const updatedHistory = [...priorMessages, userMsg];

    setMessagesByConv((prev) => ({
      ...prev,
      [targetId!]: updatedHistory,
    }));

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetId) {
          const isFirstMessage = priorMessages.length === 0;
          return {
            ...c,
            title: isFirstMessage
              ? currentText.slice(0, 32) + (currentText.length > 32 ? "..." : "")
              : c.title,
            updatedAt: now,
            messageCount: updatedHistory.length,
          };
        }
        return c;
      })
    );

    const conv = conversations.find((c) => c.id === targetId);
    const modelToUse = conv?.model || selectedModel;

    // Trigger real streaming completion
    streamFromEndpoint(targetId, updatedHistory, modelToUse);
  }, [composerValue, isGenerating, activeId, createConversation, messagesByConv, conversations, selectedModel, streamFromEndpoint]);

  const regenerateResponse = useCallback(() => {
    if (!activeId || isGenerating) return;

    const currentList = messagesByConv[activeId] || [];
    if (currentList.length === 0) return;

    // Remove the last assistant message if it exists
    let historyToUse = currentList;
    if (currentList[currentList.length - 1].role === "assistant") {
      historyToUse = currentList.slice(0, -1);
    }

    if (historyToUse.length === 0) return;

    setMessagesByConv((prev) => ({
      ...prev,
      [activeId]: historyToUse,
    }));

    const conv = conversations.find((c) => c.id === activeId);
    const modelToUse = conv?.model || selectedModel;

    streamFromEndpoint(activeId, historyToUse, modelToUse);
  }, [activeId, isGenerating, messagesByConv, conversations, selectedModel, streamFromEndpoint]);

  const handleSelectStarterPrompt = useCallback((prompt: string) => {
    setComposerValue(prompt);
  }, []);

  const changeModel = useCallback(
    (newModel: string) => {
      setSelectedModel(newModel);
      if (activeId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, model: newModel } : c))
        );
      }
    },
    [activeId]
  );

  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const activeMessages = activeId ? messagesByConv[activeId] || [] : [];

  return {
    conversations,
    activeConversation,
    activeId,
    activeMessages,
    composerValue,
    setComposerValue,
    isGenerating,
    selectedModel,
    changeModel,
    isSettingsOpen,
    openSettings: () => setIsSettingsOpen(true),
    closeSettings: () => setIsSettingsOpen(false),
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    regenerateResponse,
    handleSelectStarterPrompt,
  };
}
