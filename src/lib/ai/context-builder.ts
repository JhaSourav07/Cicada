import { OllamaChatMessage } from "./ollama";
import { getSystemPrompt } from "./prompts";
import { getModelConfig } from "./model-config";

export interface ContextBuilderOptions {
  maxMessages?: number;
  maxEstimatedTokens?: number; // Conservative budget for context window (e.g. 6000 tokens for history)
  systemPrompt?: string;
  searchContext?: string;
}

export interface BuiltContext {
  messages: OllamaChatMessage[];
  totalEstimatedTokens: number;
  trimmedMessageCount: number;
}

/**
 * Estimates token count from text using the standard heuristic (1 token ~ 3.5 - 4 chars).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Builds a clean, bounded, chronological conversation context for local inference.
 * Enforces security boundaries (stripping user-injected system prompts) and token bounds.
 */
export function buildConversationContext(
  rawHistory: Array<{ role: string; content: string }>,
  options?: ContextBuilderOptions
): BuiltContext {
  const config = getModelConfig();
  const maxMessages = options?.maxMessages || config.maxHistoryMessages;
  // Reserve ~2000 tokens for system prompt and generation headroom from the 8192 context
  const maxTokens = options?.maxEstimatedTokens || Math.min(config.numCtx - 2048, 6144);

  let effectiveSystemPrompt =
    options?.systemPrompt ||
    getSystemPrompt({ hasSearchResults: !!options?.searchContext });

  if (options?.searchContext) {
    effectiveSystemPrompt += `\n\n${options.searchContext}`;
  }

  const systemPromptTokens = estimateTokens(effectiveSystemPrompt);

  // 1. Sanitize: disallow empty content and disallow user-provided system roles
  const validDialogue = rawHistory.filter(
    (m) => (m.role === "user" || m.role === "assistant") && m.content && m.content.trim().length > 0
  );

  if (validDialogue.length === 0) {
    return {
      messages: [{ role: "system", content: effectiveSystemPrompt }],
      totalEstimatedTokens: systemPromptTokens,
      trimmedMessageCount: 0,
    };
  }

  // 2. Bound by max message count: take the most recent messages
  const candidateMessages = validDialogue.slice(-maxMessages);

  // 3. Bound by token budget using a sliding window from newest to oldest
  // Always preserve the latest message (candidateMessages[candidateMessages.length - 1])
  const selected: Array<{ role: "user" | "assistant"; content: string }> = [];
  let currentTokenSum = systemPromptTokens;

  // Process in reverse (from most recent to oldest)
  for (let i = candidateMessages.length - 1; i >= 0; i--) {
    const msg = candidateMessages[i];
    const msgTokens = estimateTokens(msg.content);

    // If it's the very latest message, always include it
    if (i === candidateMessages.length - 1 || currentTokenSum + msgTokens <= maxTokens) {
      selected.unshift({
        role: msg.role as "user" | "assistant",
        content: msg.content.trim(),
      });
      currentTokenSum += msgTokens;
    } else {
      // Exceeded token budget; break out to trim older history
      break;
    }
  }

  const trimmedCount = rawHistory.length - selected.length;

  return {
    messages: [
      { role: "system", content: effectiveSystemPrompt },
      ...selected,
    ],
    totalEstimatedTokens: currentTokenSum,
    trimmedMessageCount: Math.max(0, trimmedCount),
  };
}
