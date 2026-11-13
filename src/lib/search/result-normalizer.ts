import { RawSearxngResult, SearchSource } from "./types";
import { getSearchConfig } from "./config";

/**
 * Strips HTML tags, entities, and excessive whitespace.
 */
function cleanText(raw?: string): string {
  if (!raw) return "";

  return raw
    .replace(/<[^>]*>/g, " ") // Strip HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates and normalizes an HTTP/HTTPS URL.
 * Rejects unsafe schemes (javascript:, file:, data:, blob:) and strips tracking params.
 */
function normalizeUrl(rawUrl?: string): { valid: boolean; normalizedUrl: string; domain: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, normalizedUrl: "", domain: "" };
  }

  try {
    const parsed = new URL(rawUrl.trim());

    // Only allow http: and https: protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, normalizedUrl: "", domain: "" };
    }

    // Strip tracking parameters
    const searchParams = new URLSearchParams(parsed.search);
    const trackingPrefixes = ["utm_", "fbclid", "gclid", "ref", "source"];
    for (const key of Array.from(searchParams.keys())) {
      if (trackingPrefixes.some((p) => key.toLowerCase().startsWith(p))) {
        searchParams.delete(key);
      }
    }
    parsed.search = searchParams.toString();
    parsed.hash = ""; // Remove in-page anchors

    // Remove trailing slash for root or empty paths
    let cleanHref = parsed.toString();
    if (cleanHref.endsWith("/") && parsed.pathname === "/") {
      cleanHref = cleanHref.slice(0, -1);
    }

    const domain = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    return {
      valid: true,
      normalizedUrl: cleanHref,
      domain,
    };
  } catch {
    return { valid: false, normalizedUrl: "", domain: "" };
  }
}

/**
 * Normalizes raw SearXNG results into typed, sanitized, deduplicated SearchSources.
 */
export function normalizeSearchResults(
  rawResults: RawSearxngResult[],
  options: { maxSnippetLength?: number; maxResults?: number } = {}
): SearchSource[] {
  const config = getSearchConfig();
  const maxSnippetLength = options.maxSnippetLength ?? config.maxSnippetLength;
  const maxResults = options.maxResults ?? config.maxResults;

  const seenUrls = new Set<string>();
  const normalized: SearchSource[] = [];

  let nextId = 1;

  for (const raw of rawResults) {
    if (!raw.url) continue;

    const { valid, normalizedUrl, domain } = normalizeUrl(raw.url);
    if (!valid || !normalizedUrl || !domain) continue;

    // Deduplicate against already included URLs
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    const title = cleanText(raw.title) || domain;
    let snippet = cleanText(raw.content);

    // Limit snippet length safely without breaking mid-word if possible
    if (snippet.length > maxSnippetLength) {
      const truncated = snippet.slice(0, maxSnippetLength);
      const lastSpace = truncated.lastIndexOf(" ");
      snippet = lastSpace > maxSnippetLength * 0.7 ? `${truncated.slice(0, lastSpace)}...` : `${truncated}...`;
    }

    const publishedAt = raw.publishedDate || raw.pubdate || undefined;

    normalized.push({
      id: nextId.toString(),
      title,
      url: normalizedUrl,
      domain,
      snippet,
      publishedAt: publishedAt || undefined,
      engine: raw.engine || (raw.engines && raw.engines[0]) || undefined,
      score: typeof raw.score === "number" ? raw.score : undefined,
    });

    nextId++;

    if (normalized.length >= maxResults) {
      break;
    }
  }

  return normalized;
}
