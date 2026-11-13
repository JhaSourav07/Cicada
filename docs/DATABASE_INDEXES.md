# CICADA — Database Indexing Strategy & Performance

## 1. Index Specifications

CICADA enforces four dedicated secondary and compound indexes across its collections to guarantee high performance under growing conversation volumes:

### Conversations Collection
| Index Name | Keys | Purpose |
| :--- | :--- | :--- |
| `_id_` | `{ _id: 1 }` | Default primary key index |
| `idx_conversations_updatedAt` | `{ updatedAt: -1, _id: -1 }` | Sidebar list sorted by most recent activity |
| `idx_conversations_createdAt` | `{ createdAt: -1 }` | Chronological sort and time-series aggregation |

### Messages Collection
| Index Name | Keys | Purpose |
| :--- | :--- | :--- |
| `_id_` | `{ _id: 1 }` | Default primary key index |
| `idx_messages_conversation_chronological` | `{ conversationId: 1, createdAt: 1, _id: 1 }` | Fast message history loading & cursor pagination |
| `idx_messages_conversation_role` | `{ conversationId: 1, role: 1 }` | Role-filtered count queries |

---

## 2. Query Plan Verification (`IXSCAN` vs `COLLSCAN`)

Without indexes, MongoDB must perform a full collection scan (`COLLSCAN`), inspecting every document in the collection. With `idx_messages_conversation_chronological`, MongoDB executes an index seek (`IXSCAN`) directly to the B-tree leaf for `conversationId`:

```javascript
// Chronological message lookup
db.messages.find({ conversationId: ObjectId(...) })
  .sort({ createdAt: 1, _id: 1 })
  .explain("executionStats")
```

Verified Query Planner Output:
```json
{
  "stage": "FETCH",
  "inputStage": {
    "stage": "IXSCAN",
    "indexName": "idx_messages_conversation_chronological",
    "isMultiKey": false,
    "direction": "forward"
  }
}
```

This guarantees:
- **Zero in-memory sort**: The compound index already satisfies `{ createdAt: 1, _id: 1 }` ordering.
- **Constant-time cursor seeking**: Seeking older messages with `{ _id: { $lt: beforeId } }` utilizes index range bounds.

---

## 3. Idempotent Bootstrap

Indexes are maintained declaratively through `ensureDatabaseIndexes()` in `src/lib/db/indexes.ts`. It executes at startup or upon `/api/db/health?initIndexes=true`.

Because MongoDB's `createIndex()` is idempotent, running it repeatedly introduces zero overhead and will not duplicate existing indexes.
