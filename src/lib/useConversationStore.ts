"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Conversation, Message } from "@/types/chat";
import { consumeSSEStream } from "@/lib/ai/sse-client";

const DEFAULT_MODEL = "qwen3.5:9b";
const ACTIVE_CONV_STORAGE_KEY = "cicada_active_conv_id";

export function useConversationStore() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [composerValue, setComposerValue] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState<Record<string, boolean>>({});
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [searchMode, setSearchMode] = useState<"auto" | "on" | "off">("auto");
  const [searchStatus, setSearchStatus] = useState<{
    isSearching: boolean;
    query?: string;
    resultCount?: number;
  }>({ isSearching: false });

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchModeRef = useRef<"auto" | "on" | "off">("auto");
  useEffect(() => {
    searchModeRef.current = searchMode;
  }, [searchMode]);

  // Helper to fetch messages for a specific conversation from MongoDB
  const fetchMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages?limit=30`);
      if (!res.ok) {
        if (res.status === 404) {
          // If conversation no longer exists in DB, purge it from local list
          setConversations((prev) => prev.filter((c) => c.id !== convId));
          setActiveId(null);
        }
        return;
      }
      const data = await res.json();
      const messages: Message[] = (data.messages || []).map(
        (m: {
          id: string;
          conversationId: string;
          role: "user" | "assistant" | "system";
          content: string;
          status?: string;
          createdAt: string;
        }) => ({
          id: m.id,
          conversationId: m.conversationId,
          role: m.role,
          content: m.content,
          status: m.status === "interrupted" ? "interrupted" : "sent",
          createdAt: m.createdAt,
        })
      );

      setMessagesByConv((prev) => ({
        ...prev,
        [convId]: messages,
      }));
      setHasOlderMessages((prev) => ({
        ...prev,
        [convId]: !!data.hasMore,
      }));
    } catch (err) {
      console.error("Failed to load messages from database:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Helper to paginate and load older messages via cursor
  const loadOlderMessages = useCallback(
    async (convId?: string) => {
      const targetId = convId || activeId;
      if (!targetId || isLoadingOlder || !hasOlderMessages[targetId]) return;

      const currentList = messagesByConv[targetId] || [];
      if (currentList.length === 0) return;

      const oldestMsg = currentList[0];
      setIsLoadingOlder(true);

      try {
        const res = await fetch(
          `/api/conversations/${targetId}/messages?limit=20&before=${oldestMsg.id}`
        );
        if (!res.ok) return;

        const data = await res.json();
        const olderMessages: Message[] = (data.messages || []).map(
          (m: {
            id: string;
            conversationId: string;
            role: "user" | "assistant" | "system";
            content: string;
            status?: string;
            createdAt: string;
          }) => ({
            id: m.id,
            conversationId: m.conversationId,
            role: m.role,
            content: m.content,
            status: m.status === "interrupted" ? "interrupted" : "sent",
            createdAt: m.createdAt,
          })
        );

        if (olderMessages.length > 0) {
          setMessagesByConv((prev) => ({
            ...prev,
            [targetId]: [...olderMessages, ...(prev[targetId] || [])],
          }));
        }

        setHasOlderMessages((prev) => ({
          ...prev,
          [targetId]: !!data.hasMore,
        }));
      } catch (err) {
        console.error("Failed to load older messages:", err);
      } finally {
        setIsLoadingOlder(false);
      }
    },
    [activeId, isLoadingOlder, hasOlderMessages, messagesByConv]
  );

  // Create conversation in MongoDB
  const createConversation = useCallback(
    async (
      initialTitle = "New Conversation",
      model = selectedModel
    ): Promise<string> => {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: initialTitle, model }),
        });

        if (!res.ok) {
          throw new Error(`Failed to create conversation: HTTP ${res.status}`);
        }

        const data = await res.json();
        const newConv: Conversation = data.conversation;

        setConversations((prev) => [newConv, ...prev]);
        setMessagesByConv((prev) => ({ ...prev, [newConv.id]: [] }));
        setActiveId(newConv.id);
        if (typeof window !== "undefined") {
          localStorage.setItem(ACTIVE_CONV_STORAGE_KEY, newConv.id);
        }
        setComposerValue("");
        return newConv.id;
      } catch (err) {
        console.error("Error creating conversation:", err);
        // Fallback local conversation ID if server failed
        const fallbackId = `conv-${Date.now()}`;
        const fallbackConv: Conversation = {
          id: fallbackId,
          title: initialTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          model,
          messageCount: 0,
        };
        setConversations((prev) => [fallbackConv, ...prev]);
        setMessagesByConv((prev) => ({ ...prev, [fallbackId]: [] }));
        setActiveId(fallbackId);
        return fallbackId;
      }
    },
    [selectedModel]
  );

  // Initial load: Fetch conversations from MongoDB on mount
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoadingConversations(true);
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) throw new Error("Failed to load conversations");

        const data = await res.json();
        const loadedConvs: Conversation[] = data.conversations || [];

        if (!isMounted) return;
        setConversations(loadedConvs);

        if (loadedConvs.length > 0) {
          const savedActiveId =
            typeof window !== "undefined"
              ? localStorage.getItem(ACTIVE_CONV_STORAGE_KEY)
              : null;

          const matchedId =
            savedActiveId && loadedConvs.some((c) => c.id === savedActiveId)
              ? savedActiveId
              : loadedConvs[0].id;

          setActiveId(matchedId);
          fetchMessages(matchedId);
        } else {
          // If database is completely empty, create the first persistent conversation
          const newId = await createConversation("New Conversation");
          if (isMounted) setActiveId(newId);
        }
      } catch (err) {
        console.error("Database initialization failed:", err);
      } finally {
        if (isMounted) setIsLoadingConversations(false);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [fetchMessages, createConversation]);

  // Select conversation and load its messages if not cached
  const selectConversation = useCallback(
    (id: string) => {
      setActiveId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_CONV_STORAGE_KEY, id);
      }
      if (!messagesByConv[id]) {
        fetchMessages(id);
      }
    },
    [messagesByConv, fetchMessages]
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

  // Rename conversation in MongoDB
  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c
      )
    );

    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (err) {
      console.error("Failed to rename conversation in database:", err);
    }
  }, []);

  // Delete conversation in MongoDB with cascade
  const deleteConversation = useCallback(
    async (id: string) => {
      if (isGenerating && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsGenerating(false);
      }

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          const nextActive = filtered.length > 0 ? filtered[0].id : null;
          setActiveId(nextActive);
          if (typeof window !== "undefined") {
            if (nextActive) localStorage.setItem(ACTIVE_CONV_STORAGE_KEY, nextActive);
            else localStorage.removeItem(ACTIVE_CONV_STORAGE_KEY);
          }
          if (nextActive && !messagesByConv[nextActive]) {
            fetchMessages(nextActive);
          }
        }
        return filtered;
      });

      setMessagesByConv((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      try {
        await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete conversation from database:", err);
      }
    },
    [activeId, isGenerating, messagesByConv, fetchMessages]
  );

  // Stop active generation
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
          content: lastMsg.content
            ? `${lastMsg.content}\n\n*[Generation stopped by user]*`
            : "*[Generation stopped by user]*",
        };
        return {
          ...prev,
          [activeId]: [...currentList.slice(0, -1), updatedLast],
        };
      }
      return prev;
    });
  }, [activeId]);

  // SSE Stream helper
  const streamFromEndpoint = useCallback(
    async (targetConversationId: string, userPrompt: string, modelToUse: string) => {
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
        [targetConversationId]: [
          ...(prev[targetConversationId] || []),
          initialAssistantMessage,
        ],
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: targetConversationId,
            message: userPrompt,
            model: modelToUse,
            searchMode: searchModeRef.current,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error || `HTTP ${response.status}: Chat service failure`;

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
          onStart: (startData) => {
            // If backend resolved a title update for a new conversation, update it in state
            if (startData.title) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === targetConversationId
                    ? { ...c, title: startData.title as string }
                    : c
                )
              );
            }
          },
          onSearchStarted: (searchData) => {
            setSearchStatus({ isSearching: true, query: searchData.query });
          },
          onSearchCompleted: (searchData) => {
            setSearchStatus((prev) => ({
              ...prev,
              isSearching: false,
              resultCount: searchData.resultCount,
            }));
          },
          onSources: (sourcesData) => {
            setMessagesByConv((prev) => {
              const list = prev[targetConversationId] || [];
              return {
                ...prev,
                [targetConversationId]: list.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, sources: sourcesData.sources }
                    : m
                ),
              };
            });
          },
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
          onDone: (doneData) => {
            setMessagesByConv((prev) => {
              const list = prev[targetConversationId] || [];
              return {
                ...prev,
                [targetConversationId]: list.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        id: (doneData.messageId as string) || m.id,
                        status: "sent" as const,
                        sources: doneData.sources || m.sources,
                      }
                    : m
                ),
              };
            });
            setSearchStatus({ isSearching: false });

            // Update conversation updatedAt & messageCount
            setConversations((prev) =>
              prev.map((c) =>
                c.id === targetConversationId
                  ? {
                      ...c,
                      updatedAt: new Date().toISOString(),
                      messageCount: (c.messageCount || 0) + 2,
                    }
                  : c
              )
            );
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
          return;
        }

        const msg = err instanceof Error ? err.message : "Network failure";
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
        setSearchStatus({ isSearching: false });
        abortControllerRef.current = null;
      }
    },
    []
  );

  // Send message
  const sendMessage = useCallback(async () => {
    if (!composerValue.trim() || isGenerating) return;

    let targetId = activeId;
    const currentText = composerValue.trim();
    setComposerValue("");

    if (!targetId) {
      targetId = await createConversation();
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

    setMessagesByConv((prev) => ({
      ...prev,
      [targetId!]: [...(prev[targetId!] || []), userMsg],
    }));

    const conv = conversations.find((c) => c.id === targetId);
    const modelToUse = conv?.model || selectedModel;

    // Trigger streaming completion with persistent MongoDB backend
    streamFromEndpoint(targetId, currentText, modelToUse);
  }, [
    composerValue,
    isGenerating,
    activeId,
    createConversation,
    conversations,
    selectedModel,
    streamFromEndpoint,
  ]);

  // Regenerate last assistant response
  const regenerateResponse = useCallback(() => {
    if (!activeId || isGenerating) return;

    const currentList = messagesByConv[activeId] || [];
    if (currentList.length === 0) return;

    // Find the last user message to re-send
    const lastUserMsg = [...currentList].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;

    // Remove the last assistant message if it exists
    let historyToUse = currentList;
    if (currentList[currentList.length - 1].role === "assistant") {
      historyToUse = currentList.slice(0, -1);
    }

    setMessagesByConv((prev) => ({
      ...prev,
      [activeId]: historyToUse,
    }));

    const conv = conversations.find((c) => c.id === activeId);
    const modelToUse = conv?.model || selectedModel;

    streamFromEndpoint(activeId, lastUserMsg.content, modelToUse);
  }, [activeId, isGenerating, messagesByConv, conversations, selectedModel, streamFromEndpoint]);

  const handleSelectStarterPrompt = useCallback((prompt: string) => {
    setComposerValue(prompt);
  }, []);

  const changeModel = useCallback(
    async (newModel: string) => {
      setSelectedModel(newModel);
      if (activeId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, model: newModel } : c))
        );
        try {
          await fetch(`/api/conversations/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: newModel }),
          });
        } catch (err) {
          console.error("Failed to update conversation model in database:", err);
        }
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
    isLoadingConversations,
    isLoadingMessages,
    hasOlderMessages: activeId ? !!hasOlderMessages[activeId] : false,
    isLoadingOlder,
    loadOlderMessages,
    selectedModel,
    changeModel,
    searchMode,
    setSearchMode,
    searchStatus,
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
