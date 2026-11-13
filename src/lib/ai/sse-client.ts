import { SearchSource } from "../search/types";

export interface SSEEventMap {
  start: {
    conversationId: string;
    title?: string;
    userMessageId?: string;
    model: string;
    timestamp: string;
  };
  search_started: { query: string };
  search_completed: { resultCount: number };
  sources: { sources: SearchSource[] };
  token: { content: string };
  done: {
    conversationId?: string;
    messageId?: string | null;
    finishReason: string;
    evalCount?: number;
    evalDuration?: number;
    totalDuration?: number;
    sources?: SearchSource[];
  };
  error: { code: string; message: string };
}

export interface StreamChatHandlers {
  onStart?: (data: SSEEventMap["start"]) => void;
  onSearchStarted?: (data: SSEEventMap["search_started"]) => void;
  onSearchCompleted?: (data: SSEEventMap["search_completed"]) => void;
  onSources?: (data: SSEEventMap["sources"]) => void;
  onToken?: (token: string) => void;
  onDone?: (data: SSEEventMap["done"]) => void;
  onError?: (error: SSEEventMap["error"]) => void;
}

/**
 * Consumes a Server-Sent Events (SSE) stream from POST /api/chat.
 * Handles partial chunk buffering and multi-event fragments.
 */
export async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  handlers: StreamChatHandlers
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE event frames are separated by double newlines (\n\n)
      const frames = buffer.split("\n\n");
      // Keep trailing incomplete frame in buffer
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const trimmed = frame.trim();
        if (!trimmed) continue;

        let eventType = "message";
        let dataStr = "";

        const lines = trimmed.split("\n");
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsedData = JSON.parse(dataStr);

          if (eventType === "start" && handlers.onStart) {
            handlers.onStart(parsedData);
          } else if (eventType === "search_started" && handlers.onSearchStarted) {
            handlers.onSearchStarted(parsedData);
          } else if (eventType === "search_completed" && handlers.onSearchCompleted) {
            handlers.onSearchCompleted(parsedData);
          } else if (eventType === "sources" && handlers.onSources) {
            handlers.onSources(parsedData);
          } else if (eventType === "token" && handlers.onToken) {
            handlers.onToken(parsedData.content || "");
          } else if (eventType === "done" && handlers.onDone) {
            handlers.onDone(parsedData);
          } else if (eventType === "error" && handlers.onError) {
            handlers.onError(parsedData);
          }
        } catch (jsonErr) {
          console.error("Failed to parse SSE JSON data payload:", dataStr, jsonErr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
