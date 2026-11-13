import { z } from "zod";
import { ollamaClient, OllamaChatMessage, OllamaError } from "./ollama";
import { getModelConfig } from "./model-config";
import { buildConversationContext } from "./context-builder";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty")
    .max(8000, "Message exceeds maximum character length (8,000)"),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  model: z.string().optional(),
  messages: z
    .array(ChatMessageSchema)
    .min(1, "At least one message is required")
    .max(50, "Conversation history exceeds safety limit"),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface OrchestrationResult {
  model: string;
  conversationId: string;
  preparedMessages: OllamaChatMessage[];
  totalEstimatedTokens: number;
  trimmedMessageCount: number;
}

/**
 * Validates the incoming chat request and constructs a secure, bounded conversation context.
 */
export async function prepareChatContext(
  rawInput: unknown
): Promise<OrchestrationResult> {
  const parseResult = ChatRequestSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new OllamaError(`Validation error: ${errorDetails}`, "INVALID_RESPONSE", 400);
  }

  const { conversationId = `conv-${Date.now()}`, model, messages } = parseResult.data;
  const config = getModelConfig();
  const targetModel = model || config.defaultModel;

  // Verify the requested model is actually installed
  const isInstalled = await ollamaClient.isModelInstalled(targetModel);
  if (!isInstalled) {
    throw new OllamaError(
      `Model "${targetModel}" is not installed in local Ollama. Available models can be discovered via GET /api/ai/models.`,
      "MODEL_NOT_FOUND",
      404
    );
  }

  // Build secure, chronological, bounded conversation context
  const contextResult = buildConversationContext(messages, {
    maxMessages: config.maxHistoryMessages,
  });

  return {
    model: targetModel,
    conversationId,
    preparedMessages: contextResult.messages,
    totalEstimatedTokens: contextResult.totalEstimatedTokens,
    trimmedMessageCount: contextResult.trimmedMessageCount,
  };
}
