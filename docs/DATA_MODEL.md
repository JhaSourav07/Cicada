# CICADA — Data Model & Schema Specification

## 1. Schema Design Principles

CICADA models conversation history using a **two-collection normalized pattern** (`conversations` and `messages`) rather than embedding unbounded messages within conversation documents:

1. **Avoid 16MB Document Limits**: In an embedded document design, lengthy conversations with thousands of turns would approach MongoDB's 16MB BSON document cap.
2. **Efficient Pagination**: Sub-millisecond cursor pagination (`before` / `after`) without projecting massive arrays over the wire.
3. **Bounded Context Retrieval**: The AI orchestrator can query the exact `N` most recent messages with an indexed slice, minimizing memory allocation.

---

## 2. Collections & Documents

### A. `conversations` Collection

Tracks top-level session metadata.

```typescript
interface ConversationDocument {
  _id: ObjectId;          // MongoDB 12-byte unique identifier
  title: string;          // Human-readable title (auto-generated or user-renamed)
  model: string;          // Model name used for generation (e.g. "qwen3.5:9b")
  createdAt: Date;        // Session creation timestamp
  updatedAt: Date;        // Timestamp of latest user or assistant message
  messageCount: number;   // Total persistent messages in this conversation
}
```

### B. `messages` Collection

Stores discrete turn events (user prompts and assistant responses).

```typescript
type MessageRole = "user" | "assistant" | "system";
type MessageStatus = "complete" | "interrupted";

interface MessageDocument {
  _id: ObjectId;          // Message unique identifier (used for cursor pagination)
  conversationId: ObjectId;// Foreign key referencing conversations._id
  role: MessageRole;      // Message actor
  content: string;        // Markdown content payload
  model: string | null;   // Generating model (null for user messages)
  status: MessageStatus;  // "complete" or "interrupted" (if stopped early)
  createdAt: Date;        // Timestamp of message entry
}
```

### C. `settings` Collection

Maintains application-level defaults and inference parameters.

```typescript
interface SettingsDocument {
  _id: ObjectId;
  defaultModel: string;   // e.g. "qwen3.5:9b"
  temperature: number;    // Sampling temperature (0.0 - 2.0, default: 0.7)
  contextLength: number;  // Token window (default: 32768)
  updatedAt: Date;
}
```

---

## 3. Data Transfer Objects (DTOs)

MongoDB documents contain native BSON `ObjectId` and `Date` types. When communicating with the React client over JSON REST APIs, documents are converted via `conversationDocToDTO` and `messageDocToDTO`:

| BSON Field | DTO Field | Serialization Format |
| :--- | :--- | :--- |
| `_id: ObjectId` | `id: string` | 24-character hexadecimal string |
| `conversationId: ObjectId` | `conversationId: string` | 24-character hexadecimal string |
| `createdAt: Date` | `createdAt: string` | ISO-8601 UTC string (`2026-11-13T10:00:00.000Z`) |
| `updatedAt: Date` | `updatedAt: string` | ISO-8601 UTC string |
