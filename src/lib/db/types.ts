import { ObjectId } from "mongodb";
import { z } from "zod";
import { SearchSource, SearchMetadata } from "../search/types";

/**
 * MongoDB Document representation of a Conversation.
 */
export interface ConversationDocument {
  _id: ObjectId;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

/**
 * Message status enum:
 * - "complete": Message generation finished naturally
 * - "interrupted": Generation was stopped by user or aborted
 */
export type MessageStatus = "complete" | "interrupted";

/**
 * MongoDB Document representation of a Message.
 */
export interface MessageDocument {
  _id: ObjectId;
  conversationId: ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  status: MessageStatus;
  sources?: SearchSource[];
  searchMetadata?: SearchMetadata;
  createdAt: Date;
}

/**
 * MongoDB Document representation of persisted Application Settings.
 */
export interface SettingsDocument {
  _id: ObjectId;
  defaultModel: string;
  temperature: number;
  contextLength: number;
  updatedAt: Date;
}

/**
 * Client-facing Conversation representation (string IDs, ISO date strings).
 */
export interface ConversationDTO {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

/**
 * Client-facing Message representation (string IDs, ISO date strings).
 */
export interface MessageDTO {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  status: MessageStatus;
  sources?: SearchSource[];
  searchMetadata?: SearchMetadata;
  createdAt: string;
}

/**
 * Client-facing Settings representation.
 */
export interface SettingsDTO {
  defaultModel: string;
  temperature: number;
  contextLength: number;
  updatedAt: string;
}

/**
 * Input validation schemas
 */
export const CreateConversationSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  model: z.string().trim().min(1).max(100).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const UpdateConversationSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  model: z.string().trim().min(1).max(100).optional(),
});

export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;

export const CreateMessageSchema = z.object({
  conversationId: z.string().trim().refine((val) => ObjectId.isValid(val), {
    message: "Invalid conversation ObjectId",
  }),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().trim().min(1),
  model: z.string().trim().nullable().optional(),
  status: z.enum(["complete", "interrupted"]).optional().default("complete"),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

export const UpdateSettingsSchema = z.object({
  defaultModel: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  contextLength: z.number().int().min(1024).max(131072).optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

/**
 * Generates a clean conversation title from the first user message.
 * Collapses whitespace, removes control characters, and truncates to ~40 characters.
 */
export function generateConversationTitle(firstMessage: string, maxLength = 40): string {
  const cleaned = firstMessage
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "New Conversation";
  if (cleaned.length <= maxLength) return cleaned;

  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
}

/**
 * Conversion helpers between MongoDB documents and JSON DTOs
 */
export function conversationDocToDTO(doc: ConversationDocument): ConversationDTO {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    model: doc.model,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    messageCount: doc.messageCount,
  };
}

export function messageDocToDTO(doc: MessageDocument): MessageDTO {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId.toHexString(),
    role: doc.role,
    content: doc.content,
    model: doc.model,
    status: doc.status,
    sources: doc.sources,
    searchMetadata: doc.searchMetadata,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function settingsDocToDTO(doc: SettingsDocument): SettingsDTO {
  return {
    defaultModel: doc.defaultModel,
    temperature: doc.temperature,
    contextLength: doc.contextLength,
    updatedAt: doc.updatedAt.toISOString(),
  };
}
