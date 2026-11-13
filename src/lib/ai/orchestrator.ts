import { z } from "zod";
import { ObjectId } from "mongodb";
import { ollamaClient, OllamaChatMessage, OllamaError } from "./ollama";
import { getModelConfig } from "./model-config";
import { buildConversationContext } from "./context-builder";
import { ConversationRepository } from "../db/repositories/conversation.repository";
import { MessageRepository } from "../db/repositories/message.repository";
import { generateConversationTitle, ConversationDocument, MessageDocument } from "../db/types";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty")
    .max(8000, "Message exceeds maximum character length (8,000)"),
});

export const ChatRequestSchema = z
  .object({
    conversationId: z.string().optional(),
    model: z.string().optional(),
    message: z.string().trim().min(1).max(8000).optional(),
    messages: z.array(ChatMessageSchema).max(50).optional(),
  })
  .refine(
    (data) => (data.message && data.message.length > 0) || (data.messages && data.messages.length > 0),
    { message: "Either 'message' or 'messages' must be provided" }
  );

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface PersistentChatSession {
  conversation: ConversationDocument;
  targetModel: string;
  preparedMessages: OllamaChatMessage[];
  userMessageDoc: MessageDocument;
  totalEstimatedTokens: number;
}

/**
 * Validates request, creates or fetches MongoDB conversation, persists the incoming user message,
 * generates a title if new, and reconstructs the bounded conversation context.
 */
export async function initializeChatSession(
  rawInput: unknown
): Promise<PersistentChatSession> {
  const parseResult = ChatRequestSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new OllamaError(`Validation error: ${errorDetails}`, "INVALID_RESPONSE", 400);
  }

  const { conversationId, model, message, messages } = parseResult.data;
  const config = getModelConfig();
  const targetModel = model || config.defaultModel;

  // Extract user message content
  let userContent = "";
  if (message && message.trim().length > 0) {
    userContent = message.trim();
  } else if (messages && messages.length > 0) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    userContent = lastUserMsg ? lastUserMsg.content.trim() : messages[messages.length - 1].content.trim();
  }

  if (!userContent) {
    throw new OllamaError("User message content cannot be empty", "INVALID_RESPONSE", 400);
  }

  // Verify requested model is installed locally
  const isInstalled = await ollamaClient.isModelInstalled(targetModel);
  if (!isInstalled) {
    throw new OllamaError(
      `Model "${targetModel}" is not installed in local Ollama. Available models can be discovered via GET /api/ai/models.`,
      "MODEL_NOT_FOUND",
      404
    );
  }

  // Resolve or create conversation in MongoDB
  let conv: ConversationDocument | null = null;
  if (conversationId && ObjectId.isValid(conversationId) && new ObjectId(conversationId).toHexString() === conversationId) {
    conv = await ConversationRepository.findById(conversationId);
  }

  if (!conv) {
    // Generate an initial title from user prompt
    const initialTitle = generateConversationTitle(userContent);
    conv = await ConversationRepository.create({
      title: initialTitle,
      model: targetModel,
    });
  } else if (conv.messageCount === 0 || conv.title === "New Conversation") {
    // Update title for existing empty conversation
    const newTitle = generateConversationTitle(userContent);
    const updated = await ConversationRepository.update(conv._id, { title: newTitle });
    if (updated) conv = updated;
  }

  // Persist user message to MongoDB
  const userMessageDoc = await MessageRepository.create({
    conversationId: conv._id,
    role: "user",
    content: userContent,
    model: null,
    status: "complete",
  });

  // Load chronological message history from MongoDB for context assembly
  const historyDocs = await MessageRepository.findRecent(conv._id, config.maxHistoryMessages);
  const contextInput = historyDocs.map((doc) => ({
    role: doc.role,
    content: doc.content,
  }));

  // Build context with system prompt and safe boundaries
  const contextResult = buildConversationContext(contextInput, {
    maxMessages: config.maxHistoryMessages,
  });

  return {
    conversation: conv,
    targetModel,
    preparedMessages: contextResult.messages,
    userMessageDoc,
    totalEstimatedTokens: contextResult.totalEstimatedTokens,
  };
}
