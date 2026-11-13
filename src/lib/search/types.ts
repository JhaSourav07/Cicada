import { z } from "zod";

/**
 * User/system search intent mode:
 * - "auto": Intelligently decide via deterministic heuristics
 * - "on": Force live web search
 * - "off": Disable web search entirely
 */
export type SearchMode = "auto" | "on" | "off";

export const SearchModeSchema = z.enum(["auto", "on", "off"]).default("auto");

/**
 * Normalized source item derived from search results.
 */
export interface SearchSource {
  id: string; // e.g. "1", "2", "3"
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedAt?: string;
  engine?: string;
  score?: number;
}

/**
 * Persisted metadata recorded alongside assistant responses when search is executed.
 */
export interface SearchMetadata {
  searched: boolean;
  query?: string;
  resultCount?: number;
  searchMode?: SearchMode;
  decisionReason?: string;
}

/**
 * Output of the heuristic or LLM-based search decision engine.
 */
export interface SearchDecision {
  shouldSearch: boolean;
  reason: string;
  confidence: number;
  queryCandidate?: string;
}

/**
 * Raw result object returned inside SearXNG JSON payload.
 */
export interface RawSearxngResult {
  title?: string;
  url?: string;
  content?: string;
  engine?: string;
  engines?: string[];
  score?: number;
  publishedDate?: string | null;
  pubdate?: string | null;
}

/**
 * Complete JSON response returned by GET /search?q=...&format=json
 */
export interface SearxngResponse {
  query: string;
  results?: RawSearxngResult[];
  answers?: string[];
  infoboxes?: unknown[];
  unresponsive_engines?: [string, string][];
}

/**
 * Result of citation validation comparing model output with retrieved sources.
 */
export interface CitationValidationResult {
  validMarkers: number[];
  invalidMarkers: number[];
  sanitizedContent: string;
  activeSources: SearchSource[];
}
