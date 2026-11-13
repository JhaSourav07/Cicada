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
}

// Default singleton instance
export const ollamaClient = new OllamaClient();
