import { getModelConfig, ModelConfig } from "./model-config";

export type OllamaErrorCode =
  | "OLLAMA_UNAVAILABLE"
  | "TIMEOUT"
  | "MODEL_NOT_FOUND"
  | "STREAM_ERROR"
  | "INVALID_RESPONSE"
  | "ABORTED";

export class OllamaError extends Error {
  public readonly code: OllamaErrorCode;
  public readonly statusCode?: number;

  constructor(message: string, code: OllamaErrorCode, statusCode?: number) {
    super(message);
    this.name = "OllamaError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface OllamaVersionResponse {
  version: string;
}

export interface RawOllamaModelItem {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  parameterSize?: string;
  quantization?: string;
  family?: string;
  modifiedAt: string;
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatChunk {
  model: string;
  created_at: string;
  message?: {
    role: "assistant";
    content: string;
    thinking?: string;
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatParams {
  model?: string;
  messages: OllamaChatMessage[];
  numCtx?: number;
  temperature?: number;
  keepAlive?: string;
  signal?: AbortSignal;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export class OllamaClient {
  private config: ModelConfig;

  constructor(customConfig?: Partial<ModelConfig>) {
    this.config = { ...getModelConfig(), ...customConfig };
  }

  public get baseUrl(): string {
    return this.config.baseUrl;
  }

  public get defaultModel(): string {
    return this.config.defaultModel;
  }

  public get numCtx(): number {
    return this.config.numCtx;
  }

  /**
   * Checks whether the Ollama local HTTP server is reachable and running.
   */
  public async checkConnectivity(externalSignal?: AbortSignal): Promise<{
    connected: boolean;
    version?: string;
    error?: string;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      externalSignal.addEventListener("abort", onExternalAbort);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new OllamaError(
          `Ollama returned HTTP ${response.status}`,
          "OLLAMA_UNAVAILABLE",
          response.status
        );
      }

      const data = (await response.json()) as OllamaVersionResponse;
      return {
        connected: true,
        version: data.version,
      };
    } catch (err: unknown) {
      if (err instanceof OllamaError) {
        return { connected: false, error: err.message };
      }
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          return { connected: false, error: "Connection to Ollama timed out (5s)" };
        }
        return { connected: false, error: `Failed to connect to Ollama at ${this.baseUrl}: ${err.message}` };
      }
      return { connected: false, error: "Unknown connection error" };
    } finally {
      clearTimeout(timeout);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    }
  }

  /**
   * Fetches the list of locally downloaded models from Ollama (/api/tags).
   */
  public async listModels(externalSignal?: AbortSignal): Promise<OllamaModelInfo[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      externalSignal.addEventListener("abort", onExternalAbort);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new OllamaError(
          `Failed to fetch models from Ollama: HTTP ${response.status}`,
          "OLLAMA_UNAVAILABLE",
          response.status
        );
      }

      const data = (await response.json()) as { models?: RawOllamaModelItem[] };
      const rawModels = data.models || [];

      return rawModels.map((m) => ({
        name: m.name,
        size: m.size,
        sizeFormatted: formatBytes(m.size),
        parameterSize: m.details?.parameter_size,
        quantization: m.details?.quantization_level,
        family: m.details?.family,
        modifiedAt: m.modified_at,
      }));
    } catch (err: unknown) {
      if (err instanceof OllamaError) throw err;
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new OllamaError("Fetching models timed out", "TIMEOUT");
        }
        throw new OllamaError(
          `Failed to reach Ollama at ${this.baseUrl}: ${err.message}`,
          "OLLAMA_UNAVAILABLE"
        );
      }
      throw new OllamaError("Unknown error fetching models", "INVALID_RESPONSE");
    } finally {
      clearTimeout(timeout);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    }
  }

  /**
   * Checks whether a specific model is installed locally.
   */
  public async isModelInstalled(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(
        (m) =>
          m.name === modelName ||
          m.name === `${modelName}:latest` ||
          (modelName.endsWith(":latest") && m.name === modelName.replace(":latest", ""))
      );
    } catch {
      return false;
    }
  }

  /**
   * Streams a conversational completion from Ollama (POST /api/chat).
   * Robustly parses newline-delimited JSON (NDJSON) and yields chunks.
   */
  public async *chatStream(
    params: OllamaChatParams
  ): AsyncGenerator<OllamaChatChunk, void, unknown> {
    const targetModel = params.model || this.config.defaultModel;
    const numCtx = params.numCtx || this.config.numCtx;
    const temperature = params.temperature ?? this.config.temperature;
    const keepAlive = params.keepAlive || this.config.keepAlive;

    const requestBody = {
      model: targetModel,
      messages: params.messages,
      stream: true,
      options: {
        num_ctx: numCtx,
        temperature: temperature,
      },
      keep_alive: keepAlive,
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify(requestBody),
        signal: params.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new OllamaError("Chat request aborted", "ABORTED");
        }
        throw new OllamaError(
          `Cannot reach Ollama at ${this.baseUrl}: ${err.message}`,
          "OLLAMA_UNAVAILABLE"
        );
      }
      throw new OllamaError("Unknown connection failure to Ollama", "OLLAMA_UNAVAILABLE");
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new OllamaError(
          `Model "${targetModel}" is not installed in Ollama.`,
          "MODEL_NOT_FOUND",
          404
        );
      }
      const errorText = await response.text().catch(() => "");
      throw new OllamaError(
        `Ollama chat error (HTTP ${response.status}): ${errorText || response.statusText}`,
        "STREAM_ERROR",
        response.status
      );
    }

    if (!response.body) {
      throw new OllamaError("Ollama returned an empty response body", "INVALID_RESPONSE");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep trailing incomplete fragment in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed) as OllamaChatChunk;
            yield parsed;
          } catch (jsonErr) {
            console.error("Failed to parse Ollama NDJSON line:", trimmed, jsonErr);
          }
        }
      }

      // Flush remaining line if any
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim()) as OllamaChatChunk;
          yield parsed;
        } catch (jsonErr) {
          console.error("Failed to parse trailing Ollama NDJSON:", buffer, jsonErr);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new OllamaError("Stream aborted by user", "ABORTED");
      }
      throw err;
    } finally {
      reader.releaseLock();
    }
  }
}

// Default singleton instance
export const ollamaClient = new OllamaClient();
