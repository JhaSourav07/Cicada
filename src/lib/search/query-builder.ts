/**
 * Boilerplate conversational conversational prefixes to strip when distilling search queries.
 */
const CONVERSATIONAL_PREFIXES = [
  /^(can\s+you\s+(please\s+)?(tell\s+me|find|search|look\s+up|explain|give\s+me))\s+/i,
  /^(could\s+you\s+(please\s+)?(tell\s+me|find|search|look\s+up))\s+/i,
  /^(please\s+)?(search\s+(the\s+web\s+for|for|online\s+for)|google)\s+/i,
  /^(what\s+is\s+the|what\s+are\s+the)\s+/i,
  /^(i\s+want\s+to\s+know\s+(about\s+)?)\s+/i,
];

// Pronouns indicating conversational follow-up
const FOLLOW_UP_PRONOUNS = /\b(it|its|their|they|this|these|that|he|him|his|she|her)\b/i;

export interface QueryBuilderOptions {
  recentHistory?: { role: string; content: string }[];
  maxQueryLength?: number;
}

/**
 * Extracts a concise, effective search query from a conversational user prompt.
 * Resolves pronoun references using the immediately preceding dialogue turn if present.
 */
export function buildSearchQuery(
  rawPrompt: string,
  options: QueryBuilderOptions = {}
): string {
  const { recentHistory = [], maxQueryLength = 150 } = options;

  let query = rawPrompt.trim();

  // 1. Remove explicit search commands and conversational filler prefixes
  for (const prefix of CONVERSATIONAL_PREFIXES) {
    query = query.replace(prefix, "").trim();
  }

  // 2. Strip trailing question marks and punctuation
  query = query.replace(/[?!.]+$/, "").trim();

  // 3. Resolve conversational follow-up if query uses referential pronouns
  if (FOLLOW_UP_PRONOUNS.test(query) && recentHistory.length > 0) {
    const lastTurnSubject = extractSubjectFromHistory(recentHistory);
    if (lastTurnSubject && !query.toLowerCase().includes(lastTurnSubject.toLowerCase())) {
      // Replace leading pronoun or prepend subject
      if (/^(what\s+is\s+)?(its|their|the)\s+/i.test(query)) {
        query = query.replace(/^(what\s+is\s+)?(its|their|the)\s+/i, `${lastTurnSubject} `);
      } else {
        query = `${lastTurnSubject} ${query}`;
      }
    }
  }

  // 4. Sanitize and remove sensitive tokens / email patterns
  query = query.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "");

  // 5. Collapse excessive whitespace
  query = query.replace(/\s+/g, " ").trim();

  // 6. Bound query length safely
  if (query.length > maxQueryLength) {
    query = query.slice(0, maxQueryLength).trim();
  }

  return query || rawPrompt.slice(0, maxQueryLength).trim();
}

/**
 * Heuristically extracts the core subject or entity from the most recent user prompt in history.
 */
function extractSubjectFromHistory(
  history: { role: string; content: string }[]
): string | null {
  const previousUserMessages = history.filter((m) => m.role === "user");
  if (previousUserMessages.length === 0) return null;

  const lastUserText = previousUserMessages[previousUserMessages.length - 1].content.trim();

  // Strip common introductory patterns to isolate entity
  const simplified = lastUserText
    .replace(/^(tell\s+me\s+about|what\s+is|explain|who\s+is)\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim();

  // Return first 3-4 significant words
  const words = simplified.split(/\s+/).slice(0, 4);
  return words.length > 0 ? words.join(" ") : null;
}
