import { SearchSource, SearchMetadata, SearchMode } from "@/lib/search/types";

export type { SearchSource, SearchMetadata, SearchMode };

export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "sending" | "sent" | "error" | "interrupted";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  sources?: SearchSource[];
  searchMetadata?: SearchMetadata;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  messageCount: number;
}

export interface SystemDiagnostic {
  service: string;
  address: string;
  status: "connected" | "disconnected" | "standby";
  details?: string;
}
