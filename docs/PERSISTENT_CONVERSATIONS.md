# CICADA — Persistent Conversation Lifecycle

## 1. End-to-End Chat Flow

```
[User Browser]
      |
      | 1. POST /api/chat { conversationId?, message, model? }
      v
[Next.js API Handler]
      |
      | 2. initializeChatSession()
      +---> Resolve or create ConversationDocument in MongoDB
      +---> If first turn, generate title from message: "Explain the difference..."
      +---> Persist user MessageDocument { role: "user", status: "complete" }
      +---> Fetch recent turns from MongoDB: MessageRepository.findRecent(convId, 20)
      +---> Assemble bounded Ollama context (system prompt + sliding window)
      |
      | 3. SSE Stream Start event: { conversationId, title, userMessageId }
      v
[Browser UI receives start event]
      |
      | 4. Server-Side Token Generation
      +---> Ollama chatStream() via loopback HTTP
      +---> Stream token chunks to browser SSE reader
      +---> Accumulate generated tokens in server memory
      |
      +---> Case A: Normal Finish (done: true)
      |        Persist assistant MessageDocument { role: "assistant", status: "complete" }
      |        Increment messageCount (+2) & touch updatedAt
      |        Emit SSE done event
      |
      +---> Case B: User Cancellation (req.signal.aborted / Stop button)
               Persist assistant MessageDocument { role: "assistant", status: "interrupted" }
               Save partial tokens generated up to abort moment
               Increment messageCount & touch updatedAt
```

---

## 2. Cursor-Based Pagination (`before` / `after`)

To support arbitrary-depth conversation history without degrading render performance or overwhelming memory, CICADA implements cursor-based pagination via `GET /api/conversations/[id]/messages`:

- Initial Load: Loads the 30 most recent messages.
- Scroll-to-Top: When the user scrolls near the top, `loadOlderMessages()` fetches:
  ```http
  GET /api/conversations/{id}/messages?limit=20&before={oldestMessageId}
  ```
- The server performs:
  ```javascript
  db.messages.find({ conversationId, _id: { $lt: beforeId } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
  ```
  The returned batch is prepended seamlessly to the active message list.

---

## 3. Title Generation Algorithm

The first turn in a conversation automatically generates an expressive, bounded title using `generateConversationTitle(prompt)`:

1. Trims leading and trailing whitespace.
2. Collapses internal newlines, tabs, and spaces into single space characters.
3. If length ≤ 40 characters: returns text directly.
4. If length > 40 characters: truncates at the nearest word boundary before character 40, appending `...` to avoid cutting words in half.
