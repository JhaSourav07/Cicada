import { z } from "zod";

/**
 * Search Configuration Schema for CICADA
 * All operations bind strictly to local loopback (127.0.0.1).
 */
export const SearchConfigSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .default("http://127.0.0.1:8080")
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return (
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "localhost" ||
          parsed.hostname === "::1"
        );
      } catch {
        return false;
      }
    }, {
      message: "SearXNG URL must resolve strictly to localhost/127.0.0.1 loopback",
    }),
  automaticSearch: z.boolean().default(true),
  timeoutMs: z.number().int().positive().default(10000),
  maxResults: z.number().int().min(1).max(20).default(8),
  maxContextResults: z.number().int().min(1).max(10).default(5),
  maxSnippetLength: z.number().int().min(100).max(4000).default(1200),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export function getSearchConfig(): SearchConfig {
  const raw = {
    baseUrl: process.env.SEARXNG_BASE_URL || "http://127.0.0.1:8080",
    automaticSearch: process.env.AUTOMATIC_SEARCH !== "false",
    timeoutMs: process.env.SEARCH_TIMEOUT_MS
      ? parseInt(process.env.SEARCH_TIMEOUT_MS, 10)
      : 10000,
    maxResults: process.env.SEARCH_MAX_RESULTS
      ? parseInt(process.env.SEARCH_MAX_RESULTS, 10)
      : 8,
    maxContextResults: process.env.SEARCH_MAX_CONTEXT_RESULTS
      ? parseInt(process.env.SEARCH_MAX_CONTEXT_RESULTS, 10)
      : 5,
    maxSnippetLength: process.env.SEARCH_MAX_SNIPPET_LENGTH
      ? parseInt(process.env.SEARCH_MAX_SNIPPET_LENGTH, 10)
      : 1200,
  };

  return SearchConfigSchema.parse(raw);
}
