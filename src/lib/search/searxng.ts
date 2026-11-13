import { getSearchConfig, SearchConfig } from "./config";
import { SearxngResponse } from "./types";

export type SearchErrorCode =
  | "SEARCH_TIMEOUT"
  | "SEARCH_UNAVAILABLE"
  | "RATE_LIMITED"
  | "MALFORMED_RESPONSE"
  | "INVALID_QUERY"
  | "ABORTED";

export class SearchError extends Error {
  public readonly code: SearchErrorCode;
  public readonly statusCode?: number;

  constructor(message: string, code: SearchErrorCode, statusCode?: number) {
    super(message);
    this.name = "SearchError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface SearchOptions {
  categories?: string[];
  engines?: string[];
  pageno?: number;
  language?: string;
  signal?: AbortSignal;
}

export class SearxngClient {
  private readonly config: SearchConfig;

  constructor(customConfig?: Partial<SearchConfig>) {
    this.config = customConfig ? { ...getSearchConfig(), ...customConfig } : getSearchConfig();
  }

  /**
   * Executes a search query against local SearXNG and returns typed results.
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearxngResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new SearchError("Search query cannot be empty", "INVALID_QUERY", 400);
    }

    const url = new URL("/search", this.config.baseUrl);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "json");

    if (options.categories && options.categories.length > 0) {
      url.searchParams.set("categories", options.categories.join(","));
    }
    if (options.engines && options.engines.length > 0) {
      url.searchParams.set("engines", options.engines.join(","));
    }
    if (options.pageno && options.pageno > 1) {
      url.searchParams.set("pageno", options.pageno.toString());
    }
    if (options.language) {
      url.searchParams.set("language", options.language);
    }

    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => {
      abortController.abort();
    }, this.config.timeoutMs);

    // Link caller's AbortSignal if provided
    const onCallerAbort = () => {
      abortController.abort();
    };
    if (options.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutTimer);
        throw new SearchError("Search request aborted by client", "ABORTED", 499);
      }
      options.signal.addEventListener("abort", onCallerAbort, { once: true });
    }

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "CICADA/1.0 (Local AI Assistant)",
        },
        signal: abortController.signal,
      });

      clearTimeout(timeoutTimer);

      if (!response.ok) {
        if (response.status === 429) {
          throw new SearchError(
            "SearXNG upstream rate limit reached (HTTP 429)",
            "RATE_LIMITED",
            429
          );
        }
        if (response.status === 403) {
          throw new SearchError(
            "Access to SearXNG forbidden (HTTP 403). Check server.secret_key or limiter settings.",
            "SEARCH_UNAVAILABLE",
            403
          );
        }
        throw new SearchError(
          `SearXNG query failed with HTTP status ${response.status}`,
          "SEARCH_UNAVAILABLE",
          response.status
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("json")) {
        throw new SearchError(
          `SearXNG returned unexpected Content-Type: ${contentType}`,
          "MALFORMED_RESPONSE",
          502
        );
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch (jsonErr: unknown) {
        const msg = jsonErr instanceof Error ? jsonErr.message : "JSON parse failed";
        throw new SearchError(
          `Failed to parse SearXNG JSON response: ${msg}`,
          "MALFORMED_RESPONSE",
          502
        );
      }

      if (!data || typeof data !== "object") {
        throw new SearchError(
          "Malformed SearXNG response: expected JSON object",
          "MALFORMED_RESPONSE",
          502
        );
      }

      const typedData = data as SearxngResponse;
      if (!Array.isArray(typedData.results)) {
        typedData.results = [];
      }

      return typedData;
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);

      if (err instanceof SearchError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          if (options.signal?.aborted) {
            throw new SearchError("Search request cancelled by user", "ABORTED", 499);
          }
          throw new SearchError(
            `SearXNG request timed out after ${this.config.timeoutMs}ms`,
            "SEARCH_TIMEOUT",
            504
          );
        }

        throw new SearchError(
          `Failed to connect to SearXNG at ${this.config.baseUrl}: ${err.message}`,
          "SEARCH_UNAVAILABLE",
          503
        );
      }

      throw new SearchError(
        "Unknown error while communicating with SearXNG",
        "SEARCH_UNAVAILABLE",
        500
      );
    } finally {
      clearTimeout(timeoutTimer);
      if (options.signal) {
        options.signal.removeEventListener("abort", onCallerAbort);
      }
    }
  }

  /**
   * Fast health probe to verify SearXNG availability without heavy querying.
   */
  async ping(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    const start = performance.now();
    try {
      await this.search("ping", { pageno: 1 });
      return {
        connected: true,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ping failed";
      return {
        connected: false,
        error: msg,
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }
}

export const searxngClient = new SearxngClient();
