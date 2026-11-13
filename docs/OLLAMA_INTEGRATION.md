# Ollama Local AI Integration

This document outlines how CICADA interfaces directly with the local Ollama daemon on Fedora Linux for completely offline, private AI inference.

---

## 1. Local Server Architecture & Loopback Boundary

Ollama runs as a native system service or background daemon listening on `127.0.0.1:11434`. 
All communication between CICADA and Ollama remains strictly internal.

```
+------------------------------------------------------------------+
|                           LOCAL HOST                             |
|                                                                  |
|   +-----------------------+              +-------------------+   |
|   |  Next.js Server Side  | == HTTP ==>  |   Ollama Daemon   |   |
|   |  (Route Handlers)     |              | (127.0.0.1:11434) |   |
|   +-----------------------+              +---------+---------+   |
|                                                    |             |
|                                            +-------v-------+     |
|                                            |  NVIDIA GPU   |     |
|                                            | (RTX 4060 8GB)|     |
|                                            +---------------+     |
+------------------------------------------------------------------+
```

### Why the browser never talks directly to Ollama:
1. **Zero Secret / Port Exposure**: The browser client only knows `POST /api/chat`.
2. **Context Integrity & Guardrails**: System prompts and sliding-window token budgets must be applied on the server to prevent client-side tampering or injection.
3. **CORS and Connection Lifecycle**: Long-lived streams and AbortSignal handling are cleanly managed through the Next.js runtime.

---

## 2. API Endpoints Used

| Endpoint | Method | Responsibility | CICADA Consumer |
| :--- | :--- | :--- | :--- |
| `/api/version` | `GET` | Verifies daemon connectivity and reports version | `ollamaClient.checkConnectivity()` |
| `/api/tags` | `GET` | Discovers locally installed GGUF models | `ollamaClient.listModels()` |
| `/api/chat` | `POST` | Streams chat completions as newline-delimited JSON | `ollamaClient.chatStream()` |

---

## 3. GPU Acceleration & Hardware Fit

- **GPU**: NVIDIA GeForce RTX 4060 (8GB VRAM).
- **RAM**: 16 GB.
- **Model**: `qwen3.5:9b` (Q4_K_M GGUF, 9.0 Billion parameters, ~5.6 GB VRAM resident).
- **GPU Residency**: Verified via `ollama ps` as **100% GPU**. Zero CPU offloading occurs.
- **Context Length**: Configured to a conservative 8,192 tokens (`num_ctx: 8192`) to prevent out-of-memory (OOM) errors during heavy generation.

---

## 4. Benchmark Performance Metrics

Benchmarked on `qwen3.5:9b` on Fedora Linux:

- **Generation Speed**: **42.10 tokens/second**
- **Prompt Evaluation**: 25 prompt tokens evaluated in ~50ms
- **VRAM Utilization**: ~5.6 GB / 8.0 GB (~70% VRAM budget)
- **Time to First Token (TTFT)**: Includes Qwen thinking phase before answer emission
