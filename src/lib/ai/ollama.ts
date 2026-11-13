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
      // Match exact name or alias (e.g. "qwen3.5:9b" matches "qwen3.5:9b" or "qwen3.5:9b:latest")
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
}

// Default singleton instance
export const ollamaClient = new OllamaClient();
