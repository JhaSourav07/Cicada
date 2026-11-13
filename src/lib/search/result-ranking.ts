import { SearchSource } from "./types";
import { getSearchConfig } from "./config";

export interface RankingOptions {
  maxContextResults?: number;
  maxPerDomain?: number;
}

/**
 * Tokenizes text into lowercase alphanumeric keywords of length >= 2.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

/**
 * Computes an explainable relevance score for a search result against the query keywords.
 */
export function scoreResult(source: SearchSource, query: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return source.score ?? 0;

  const titleLower = source.title.toLowerCase();
  const snippetLower = source.snippet.toLowerCase();
  const queryLower = query.toLowerCase();

  let score = source.score ? source.score * 0.5 : 0;

  // 1. Exact query match in title
  if (titleLower.includes(queryLower)) {
    score += 4.0;
  }

  // 2. Exact query match in snippet
  if (snippetLower.includes(queryLower)) {
    score += 2.0;
  }

  // 3. Keyword matches in title
  const titleTokens = new Set(tokenize(titleLower));
  let titleMatches = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      titleMatches++;
    }
  }
  score += (titleMatches / queryTokens.length) * 3.0;

  // 4. Keyword matches in snippet
  const snippetTokens = new Set(tokenize(snippetLower));
  let snippetMatches = 0;
  for (const token of queryTokens) {
    if (snippetTokens.has(token)) {
      snippetMatches++;
    }
  }
  score += (snippetMatches / queryTokens.length) * 1.5;

  // 5. Freshness bonus if published recently (references 2025 or 2026)
  if (source.publishedAt) {
    if (source.publishedAt.includes("2026") || source.publishedAt.includes("2025")) {
      score += 0.5;
    }
  }

  return Math.round(score * 100) / 100;
}

/**
 * Ranks search results, enforces domain diversity limits, and selects the top bounded subset.
 * Re-indexes source IDs to 1..N sequentially for clean, unambiguous LLM citation markers.
 */
export function rankAndSelectSources(
  sources: SearchSource[],
  query: string,
  options: RankingOptions = {}
): SearchSource[] {
  const config = getSearchConfig();
  const maxContextResults = options.maxContextResults ?? config.maxContextResults;
  const maxPerDomain = options.maxPerDomain ?? 2;

  // Score each candidate source
  const scored = sources.map((source) => ({
    ...source,
    score: scoreResult(source, query),
  }));

  // Sort descending by calculated score
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Enforce domain diversity
  const domainCounts = new Map<string, number>();
  const selected: SearchSource[] = [];

  for (const item of scored) {
    const count = domainCounts.get(item.domain) || 0;
    if (count >= maxPerDomain) {
      continue;
    }

    domainCounts.set(item.domain, count + 1);
    selected.push(item);

    if (selected.length >= maxContextResults) {
      break;
    }
  }

  // Assign sequential 1-based IDs for prompt referencing
  return selected.map((item, idx) => ({
    ...item,
    id: (idx + 1).toString(),
  }));
}
