# Conversation Context & Window Management

This document details how multi-turn dialogue is structured, bounded, and passed to local LLMs in CICADA.

---

## 1. Multi-Turn Dialogue Lifecycle

In stateless local LLM APIs, the model does not remember previous user interactions automatically. Every request to `POST /api/chat` must supply the complete dialogue history:

```json
[
  { "role": "system", "content": "You are CICADA..." },
  { "role": "user", "content": "My name is Sourav." },
  { "role": "assistant", "content": "Nice to meet you, Sourav!" },
  { "role": "user", "content": "What is my name?" }
]
```

When Ollama processes this sequence, Qwen leverages its attention mechanism across previous turns to correctly reply: *"Your name is Sourav."*

---

## 2. Sliding Window Context Trimming

The model context window is 8,192 tokens. Unbounded conversation history would eventually overflow the context window, causing inference errors or GPU out-of-memory crashes.

### Trimming Strategy:
1. **Authoritative System Prompt**: Always pinned at index `0`.
2. **Reverse Traversal**: Candidates are examined from newest to oldest.
3. **Latest Message Preservation**: The current user query is guaranteed inclusion.
4. **Sliding Window**: Oldest turns are pruned once total estimated tokens exceed the safe context headroom (`~6,144 tokens`).

---

## 3. Security Boundaries & Injection Defense

- **Client System Message Stripping**: The orchestrator explicitly ignores any message with `role: "system"` sent by the client. Only the trusted server-defined system prompt (`src/lib/ai/prompts.ts`) is applied.
- **Empty Message Elimination**: Zero-length or whitespace-only messages are stripped before passing to Ollama.
- **Character Safeguards**: Single messages are capped at 8,000 characters.
