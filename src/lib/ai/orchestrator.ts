import { z } from "zod";
import { ObjectId } from "mongodb";
import { ollamaClient, OllamaChatMessage, OllamaError } from "./ollama";
import { getModelConfig } from "./model-config";
import { buildConversationContext } from "./context-builder";
import { ConversationRepository } from "../db/repositories/conversation.repository";
import { MessageRepository } from "../db/repositories/message.repository";
import { generateConversationTitle, ConversationDocument, MessageDocument } from "../db/types";
import { SearchMode, SearchSource, SearchDecision } from "../search/types";
import { decideSearch } from "../search/search-decision";
import { buildSearchQuery } from "../search/query-builder";
import { searxngClient } from "../search/searxng";
import { normalizeSearchResults } from "../search/result-normalizer";
import { rankAndSelectSources } from "../search/result-ranking";
import { buildSearchContextBlock } from "../search/search-context";

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
    searchMode: z.enum(["auto", "on", "off"]).optional(),
  })
  .refine(
    (data) => (data.message && data.message.length > 0) || (data.messages && data.messages.length > 0),
    { message: "Either 'message' or 'messages' must be provided" }
  );

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface SearchExecutionPlan {
  searchMode: SearchMode;
  decision: SearchDecision;
  searched: boolean;
  query?: string;
  sources: SearchSource[];
  error?: string;
}

export interface PersistentChatSession {
  conversation: ConversationDocument;
  targetModel: string;
  preparedMessages: OllamaChatMessage[];
  userMessageDoc: MessageDocument;
  totalEstimatedTokens: number;
  searchPlan: SearchExecutionPlan;
}

/**
 * Validates request, creates or fetches MongoDB conversation, persists the incoming user message,
 * generates a title if new, evaluates search need, retrieves sources from SearXNG if indicated,
 * and reconstructs the bounded conversation context.
 */
export async function initializeChatSession(
  rawInput: unknown,
  options: { signal?: AbortSignal } = {}
): Promise<PersistentChatSession> {
  const parseResult = ChatRequestSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new OllamaError(`Validation error: ${errorDetails}`, "INVALID_RESPONSE", 400);
  }

  const { conversationId, model, message, messages, searchMode = "auto" } = parseResult.data;
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

  // Determine whether web search is required
  const decision = decideSearch(userContent, {
    searchMode,
    recentHistory: contextInput,
  });

  let searchExecution: SearchExecutionPlan = {
    searchMode,
    decision,
    searched: false,
    sources: [],
  };

  let searchContextBlock = "";

  if (decision.shouldSearch) {
    const query = buildSearchQuery(userContent, {
      recentHistory: contextInput,
    });

    try {
      const rawResponse = await searxngClient.search(query, {
        signal: options.signal,
      });

      const normalized = normalizeSearchResults(rawResponse.results || []);
      const ranked = rankAndSelectSources(normalized, query);

      if (ranked.length > 0) {
        searchContextBlock = buildSearchContextBlock(ranked, query);
        searchExecution = {
          searchMode,
          decision,
          searched: true,
          query,
          sources: ranked,
        };
      } else {
        searchExecution = {
          searchMode,
          decision,
          searched: true,
          query,
          sources: [],
        };
      }
    } catch (err: unknown) {
      // Graceful offline fallback: log error and proceed with base model weights
      const msg = err instanceof Error ? err.message : "Search unavailable";
      searchExecution = {
        searchMode,
        decision,
        searched: false,
        query,
        sources: [],
        error: msg,
      };
    }
  }

  // Build bounded context with system prompt and search context
  const contextResult = buildConversationContext(contextInput, {
    maxMessages: config.maxHistoryMessages,
    searchContext: searchContextBlock || undefined,
  });

  return {
    conversation: conv,
    targetModel,
    preparedMessages: contextResult.messages,
    userMessageDoc,
    totalEstimatedTokens: contextResult.totalEstimatedTokens,
    searchPlan: searchExecution,
  };
}
