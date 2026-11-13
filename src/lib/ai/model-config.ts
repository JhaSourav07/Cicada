import { z } from "zod";

export const DEFAULT_MODEL_NAME = "qwen3.5:9b";

/**
 * Model Configuration Schema for CICADA
 * Configured specifically for local inference on an NVIDIA RTX 4060 8GB VRAM / 16GB RAM system.
 */
export const ModelConfigSchema = z.object({
  baseUrl: z.string().url().default("http://127.0.0.1:11434"),
  defaultModel: z.string().min(1).default("qwen3.5:9b"),
  numCtx: z.number().int().positive().default(8192), // Conservative 8K context to fit 8GB VRAM
  temperature: z.number().min(0).max(2).default(0.7),
  keepAlive: z.string().default("5m"),
  timeoutMs: z.number().int().positive().default(60000), // 60s timeout
  maxMessageChars: z.number().int().positive().default(8000),
  maxHistoryMessages: z.number().int().positive().default(20),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Reads server environment variables with fallback defaults.
 * Variables are kept strictly server-side (no NEXT_PUBLIC_ exposure).
 */
export function getModelConfig(): ModelConfig {
  const rawConfig = {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    defaultModel: process.env.OLLAMA_MODEL || "qwen3.5:9b",
    numCtx: process.env.OLLAMA_NUM_CTX ? parseInt(process.env.OLLAMA_NUM_CTX, 10) : 8192,
    temperature: process.env.OLLAMA_TEMPERATURE ? parseFloat(process.env.OLLAMA_TEMPERATURE) : 0.7,
    keepAlive: process.env.OLLAMA_KEEP_ALIVE || "5m",
    timeoutMs: process.env.OLLAMA_TIMEOUT_MS ? parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) : 60000,
    maxMessageChars: 8000,
    maxHistoryMessages: 20,
  };

  return ModelConfigSchema.parse(rawConfig);
}
