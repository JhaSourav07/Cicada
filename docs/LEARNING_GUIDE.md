# CICADA Developer Learning Guide

Welcome to the engineering guide for CICADA. This document explains the architecture, mental models, and software design decisions powering our local-first AI assistant.

---

## 1. What is an LLM? (Foundational Mental Model)

An **LLM (Large Language Model)** is a statistical sequence-prediction engine trained on massive text corpora. It predicts the probability distribution of the next token given a sequence of prior tokens:

- **Tokens**: The atomic units of text processed by language models. A token is typically a word fragment, character, or punctuation mark. In English, 1 token averages ~3.5 to 4 characters (e.g. `"CICADA"` is split into 2-3 subword tokens).
- **Token Generation (Autoregression)**: The model samples one token at a time, appends it to its input sequence, and repeats the process until it emits an end-of-sequence (`stop`) token.
- **Context Window**: The maximum sequence length (input prompt + generated response) the model can hold in its attention mechanism at once. In CICADA, we configure `qwen3.5:9b` with an **8,192 token** context window.
- **Inference**: The execution phase where a pre-trained model computes predictions without altering its weights.
- **Model Parameters**: The internal connection weights of the neural network. `qwen3.5:9b` possesses 9 billion parameters.
- **Quantization**: Compressing 16-bit floating-point weights (`FP16`) into 4-bit integers (`Q4_K_M`). This reduces memory consumption from ~18GB down to ~5.6GB, enabling full execution on consumer GPUs like our 8GB NVIDIA RTX 4060 with virtually no perceptual loss in response quality.

---

## 2. What is Ollama?

**Ollama** is a local LLM runner and model manager written in Go and C++ (leveraging `llama.cpp` under the hood):

- **Ollama Server**: A local daemon running on `127.0.0.1:11434` providing REST and streaming endpoints.
- **Model Management**: Manages GGUF model binaries, tags, and execution manifests (`ollama list`, `ollama pull`, `ollama run`).
- **GPU Offloading**: During startup, Ollama detects GPU capabilities (via CUDA/ROCm) and maps network layers into VRAM. On our system, `ollama ps` confirms:
  ```
  NAME          SIZE      PROCESSOR    RUNNER
  qwen3.5:9b    5.6 GB    100% GPU     llamacpp
  ```
  This guarantees that 100% of matrix multiplications run on NVIDIA Tensor cores, achieving over 42 tokens/second.

---

## 3. How CICADA Communicates with AI (Full Lifecycle)

Every user message follows this secure, server-mediated request lifecycle:

```
1. [User types prompt in ChatComposer]
       |
2. [useConversationStore dispatches sendMessage()]
       |
3. [Browser initiates POST /api/chat with fetch() & AbortController]
       |
4. [Next.js Route Handler receives request in src/app/api/chat/route.ts]
       |
5. [prepareChatContext validates input via Zod and injects CICADA system prompt]
       |
6. [OllamaClient calls local POST http://127.0.0.1:11434/api/chat with stream: true]
       |
7. [Ollama generates tokens on NVIDIA RTX 4060 and emits NDJSON chunks]
       |
8. [OllamaClient decodes NDJSON stream handling chunk fragmentation]
       |
9. [Route Handler formats SSE events: start -> token -> done]
       |
10. [consumeSSEStream in browser parses events via TextDecoder]
       |
11. [React state updates active message text in real time with auto-scroll]
```

---

## 4. Streaming Mechanics

### Why Streaming is Essential
In batch inference, generating 500 tokens at 40 tokens/sec would force the user to stare at a blank screen for 12.5 seconds. With real-time streaming, the first token renders in milliseconds, creating an immediate, responsive experience.

### The Protocol Layers
1. **Upstream (Ollama -> Next.js)**: Newline-Delimited JSON (NDJSON):
   ```json
   {"message": {"role": "assistant", "content": "Hello"}, "done": false}
   ```
2. **Downstream (Next.js -> Browser)**: Server-Sent Events (SSE):
   ```
   event: token
   data: {"content": "Hello"}
   ```

### Chunk Buffering
Network reads are non-deterministic. A TCP packet can split a JSON payload halfway through:
`{"content": "Hel` + `lo"}`.
Our streaming clients buffer incoming bytes, split on delimiters (`\n` for NDJSON, `\n\n` for SSE), and hold any trailing incomplete fragment for the next read.

---

## 5. Multi-Turn Conversation Context

LLMs are purely stateless functions: $y = f(x)$. To maintain a multi-turn conversation, previous dialogue turns must be submitted with each request:

1. **System Prompt**: Identifies CICADA's persona, operating environment, and security boundaries.
2. **Alternating Dialogue**: Chronological pairs of `user` and `assistant` messages.
3. **Sliding Window Budget**: Trims the oldest conversational turns once total estimated tokens exceed the context threshold, ensuring the model never crashes due to context limits.

---

## 6. Performance & Hardware on Fedora Linux

Hardware Specs:
- **GPU**: NVIDIA GeForce RTX 4060 8GB VRAM
- **RAM**: 16 GB
- **OS**: Fedora Linux (Kernel 6.x)

Measured Benchmarks:
- **Inference Speed**: ~42.10 tokens/second on `qwen3.5:9b` (Q4_K_M).
- **Time to First Token**: Includes Qwen reasoning/thinking phase prior to content streaming.
- **VRAM Footprint**: ~5.6 GB resident during active generation, leaving ~2.4 GB headroom for OS display buffers and window compositing.

---

## 7. MongoDB Architecture & Database Engineering

### Why the Official Driver Over an ORM?
In Next.js serverless and long-running Node.js environments, ORMs like Prisma introduce a heavy query engine binary, additional memory consumption, and schema generation complexity. By using the official `mongodb` driver directly:
1. **Lightweight Footprint**: Zero binary sidecars, sub-millisecond connection times, and low memory overhead (~37MB RAM).
2. **Native BSON Capabilities**: Direct use of 12-byte `ObjectId` types, embedded document sorting, and optimized compound index hints.
3. **Connection Pooling in Next.js**: We store the active `MongoClient` promise on `globalThis` during development mode, guaranteeing that Next.js Hot Module Replacement (HMR) does not spawn orphaned connections on code recompilation.

### Normalized vs Embedded Schema Design
Rather than nesting an unbounded array of messages inside each conversation document, CICADA separates conversations and messages into distinct collections:
- Prevents hitting the 16MB BSON document size ceiling on long conversations.
- Enables efficient cursor-based pagination (`before` / `after` message IDs).
- Supports sub-millisecond retrieval of the most recent turns (`findRecent(convId, 20)`) for fast AI context assembly.

### Rootless Podman & Quadlet on Fedora
Rather than requiring root daemon privileges (like Docker) or relying on out-of-repo packages, MongoDB runs via rootless Podman managed by systemd user Quadlets. This guarantees:
- Non-root user execution (`uid 1000`).
- Automated startup and restart on system boot.
- Loopback isolation: port 27017 is bound strictly to `127.0.0.1`.
- Clean volume persistence in user space (`cicada-mongodb-data`).
