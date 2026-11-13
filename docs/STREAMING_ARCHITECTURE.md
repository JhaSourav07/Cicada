# CICADA Streaming Architecture

This document explains the real-time token streaming pipeline connecting Ollama, the Next.js server, and the React frontend.

---

## 1. End-to-End Pipeline Overview

```
[Browser Client]
       |  POST /api/chat (Fetch API with AbortController)
       v
[Next.js App Server (src/app/api/chat/route.ts)]
       |  POST http://127.0.0.1:11434/api/chat (stream: true)
       v
[Ollama Daemon (qwen3.5:9b)]
       |  Streams Newline-Delimited JSON (NDJSON) chunks
       v
[OllamaClient Parser (src/lib/ai/ollama.ts)]
       |  Decodes fragments and yields OllamaChatChunk
       v
[SSE Formatter in route.ts]
       |  Encodes events: start, token, done, error
       v
[consumeSSEStream in Browser (src/lib/ai/sse-client.ts)]
       |  Incrementally updates active message in React state
       v
[ChatWindow UI] (Renders live typing cursor & markdown blocks)
```

---

## 2. Server-Sent Events (SSE) Protocol

CICADA uses standard Server-Sent Events over HTTP. Each event frame is terminated by a double newline (`\n\n`):

### Event Types:

1. **`start`**:
   Emitted once before token generation begins.
   ```
   event: start
   data: {"conversationId":"conv-123","model":"qwen3.5:9b","timestamp":"..."}
   ```

2. **`token`**:
   Emitted whenever the local model emits an incremental text token.
   ```
   event: token
   data: {"content":"Hello"}
   ```

3. **`done`**:
   Emitted when inference finishes normally.
   ```
   event: done
   data: {"finishReason":"stop","evalCount":128,"evalDuration":3040000000}
   ```

4. **`error`**:
   Emitted if an upstream or validation failure occurs.
   ```
   event: error
   data: {"code":"OLLAMA_UNAVAILABLE","message":"Connection refused"}
   ```

---

## 3. Robust Chunk & Fragment Handling

Network streams do not guarantee that each network read (`reader.read()`) contains exactly one complete JSON object or event frame. 

- A network read might contain half a line (`{"content": "Hel`).
- The subsequent read might contain the remainder (`lo"}\n\n`).

### The Double-Newline Framing Algorithm:
```typescript
buffer += decoder.decode(chunk, { stream: true });
const frames = buffer.split("\n\n");
buffer = frames.pop() ?? ""; // Retain incomplete fragment for the next read
```
This algorithm guarantees zero lost tokens and prevents `JSON.parse` syntax errors during streaming.

---

## 4. Cancellation & Interruption via AbortController

When the user clicks the "Stop" button in the composer:
1. `abortController.abort()` is called in the browser.
2. The browser immediately closes the HTTP connection to Next.js.
3. Next.js detects `req.signal.aborted`.
4. The signal is propagated to the upstream `fetch` request to Ollama.
5. Ollama aborts model inference and halts GPU processing.
6. The frontend preserves all tokens received prior to cancellation, tagging the message with `status: "interrupted"`.
