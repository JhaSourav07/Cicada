import { SearchMode, SearchDecision } from "./types";

// Patterns indicating explicit search intent
const EXPLICIT_SEARCH_PATTERNS = [
  /\bsearch\s+(the\s+)?(web|internet|online|for)\b/i,
  /\blook\s+up\s+online\b/i,
  /\bfind\s+(online|on\s+the\s+web)\b/i,
  /\bcheck\s+the\s+(web|internet|latest)\b/i,
  /\bgoogle\b/i,
];

// Patterns indicating explicit refusal of web search
const EXPLICIT_NO_SEARCH_PATTERNS = [
  /\b(do\s+not|don't)\s+search\b/i,
  /\bwithout\s+(searching|using\s+the\s+web)\b/i,
  /\bfrom\s+(your\s+)?memory\b/i,
  /\bno\s+search\b/i,
];

// Keywords indicating time-sensitive, current, or recent events
const TEMPORAL_FRESHNESS_PATTERNS = [
  /\b(latest|recent|currently|current|newest|today|yesterday|this\s+week|this\s+month|this\s+year)\b/i,
  /\b(breaking\s+news|just\s+announced|press\s+release|release\s+notes)\b/i,
  /\b(upcoming|roadmap|scheduled\s+for)\b/i,
  /\b(2025|2026)\b/i,
];

// Keywords indicating market, price, or live state data
const MARKET_AND_LIVE_PATTERNS = [
  /\b(price|cost|how\s+much\s+is|specs|specifications)\s+(of|for)\b/i,
  /\b(stock\s+price|market\s+cap|valuation|exchange\s+rate|weather\s+in)\b/i,
  /\b(who\s+won|score\s+of|match\s+result|election\s+results)\b/i,
  /\bwhat\s+(is\s+the\s+latest\s+version|version\s+is\s+current)\b/i,
];

// Negative patterns: general conceptual, mathematical, code templates, creative writing
const STATIC_TOPIC_PATTERNS = [
  /^(what\s+is|explain|how\s+does)\s+(a\s+|an\s+|the\s+)?(closure|promise|event\s+loop|recursion|algorithm|binary\s+search|pointer|mutex|semaphore|monad|class|interface|decorator)\b/i,
  /^(how\s+to\s+(write|implement|create|sort|reverse|filter))\b/i,
  /^(write|draft|compose)\s+(a\s+|an\s+)?(poem|story|song|email|letter|essay|greeting)\b/i,
  /^(calculate|solve|evaluate|compute)\s+[\d\s+\-*/^().xXyYzZ=]+$/i,
  /^(translate|convert)\s+(this|the\s+following)?/i,
];

export interface SearchDecisionOptions {
  searchMode?: SearchMode;
  recentHistory?: { role: string; content: string }[];
}

/**
 * Deterministically decides whether an incoming user message requires live web search.
 * Avoids extra GPU inference / latency by using fast, transparent, explainable heuristics.
 */
export function decideSearch(
  message: string,
  options: SearchDecisionOptions = {}
): SearchDecision {
  const mode = options.searchMode || "auto";
  const trimmed = message.trim();

  // 1. User Mode Override: Explicit Off
  if (mode === "off") {
    return {
      shouldSearch: false,
      reason: "Search explicitly disabled by user setting",
      confidence: 1.0,
    };
  }

  // 2. User Mode Override: Explicit On
  if (mode === "on") {
    return {
      shouldSearch: true,
      reason: "Search forced by user setting",
      confidence: 1.0,
      queryCandidate: trimmed,
    };
  }

  // 3. Explicit No-Search in user prompt text
  for (const pattern of EXPLICIT_NO_SEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        shouldSearch: false,
        reason: "User explicitly instructed not to search the web",
        confidence: 0.95,
      };
    }
  }

  // 4. Explicit Search instruction in user prompt text
  for (const pattern of EXPLICIT_SEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        shouldSearch: true,
        reason: "User explicitly requested a web search",
        confidence: 0.95,
        queryCandidate: trimmed,
      };
    }
  }

  // 5. Check for Static / Conceptual / Math questions that should NOT search
  for (const pattern of STATIC_TOPIC_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Unless it explicitly contains temporal words like "latest" or "2026"
      const hasTemporalOverride = TEMPORAL_FRESHNESS_PATTERNS.some((p) => p.test(trimmed));
      if (!hasTemporalOverride) {
        return {
          shouldSearch: false,
          reason: "General conceptual, algorithmic, or coding explanation",
          confidence: 0.85,
        };
      }
    }
  }

  // 6. Check for Temporal / Freshness indicators
  for (const pattern of TEMPORAL_FRESHNESS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        shouldSearch: true,
        reason: "Query references time-sensitive, recent, or current information",
        confidence: 0.9,
        queryCandidate: trimmed,
      };
    }
  }

  // 7. Check for Market, Price, or Live Events
  for (const pattern of MARKET_AND_LIVE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        shouldSearch: true,
        reason: "Query references live market, product pricing, or current event data",
        confidence: 0.88,
        queryCandidate: trimmed,
      };
    }
  }

  // 8. Default fallback: answer from model internal parameters
  return {
    shouldSearch: false,
    reason: "Standard conversational inquiry answerable from base model weights",
    confidence: 0.75,
  };
}
