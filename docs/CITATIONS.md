# Grounded Citations & Hallucination Prevention

This document details how CICADA extracts, validates, and renders grounded source citations (`src/lib/search/citations.ts`, `src/components/chat/CitationBadge.tsx`, and `src/components/chat/AssistantMessage.tsx`).

---

## 1. The Citation Problem in Local LLMs

Local open-weight language models like Qwen 2.5/3.5 excel at summarizing retrieved text. However, they are prone to two distinct citation failure modes:
1. **Citation Hallucination**: The model invents citation markers that do not exist in the retrieved context (e.g., generating `[6]` or `[99]` when only 3 sources were provided).
2. **Citation Drift**: Over multi-turn dialogue, the model might conflate numbers from earlier turns with the current turn.

CICADA solves this with a **two-tier citation enforcement architecture**:
- **Prompt Grounding**: The system prompt instructs the model to reference sources using strict `[N]` syntax.
- **Server-Side Citation Validation**: A post-processor validates all generated `[N]` tokens against the actual sources provided, stripping invalid numbers before database storage and client delivery.

---

## 2. Validation Algorithm (`citations.ts`)

```typescript
export function validateCitations(
  responseContent: string,
  availableSources: SearchSource[]
): { sanitizedContent: string; validCitations: string[] }
```

### Steps:
1. Extract valid source identifiers $\{1, \dots, K\}$ from `availableSources`. If sources array is empty, strip all bracketed citation markers.
2. Match all bracketed number occurrences: `\[(\d+(?:\s*,\s*\d+)*)\]`.
3. Filter individual numbers within each bracket. If a bracket contains `[1, 99]`, keep only `[1]`.
4. If none of the numbers inside the brackets are valid, delete the entire bracket token without leaving dangling spaces.
5. Return the cleaned string and the set of referenced citations.

---

## 3. Database Persistence

In MongoDB, messages with search retrieval store both the sources array and search metadata:

```json
{
  "_id": { "$oid": "6734c56e39df1d072f8812a4" },
  "conversationId": { "$oid": "6734c56e39df1d072f8812a0" },
  "role": "assistant",
  "content": "Fedora 41 was officially released on October 29, 2024 [1], featuring Linux Kernel 6.11 and GNOME 47 [2].",
  "model": "qwen3.5:9b",
  "status": "complete",
  "sources": [
    {
      "id": "1",
      "title": "Fedora Linux 41 Is Officially Released",
      "url": "https://fedoramagazine.org/fedora-linux-41-is-here/",
      "domain": "fedoramagazine.org",
      "snippet": "Fedora Linux 41 is officially available for general consumption...",
      "score": 2.4
    },
    {
      "id": "2",
      "title": "Fedora 41 Release Schedule",
      "url": "https://fedoraproject.org/wiki/Releases/41/Schedule",
      "domain": "fedoraproject.org",
      "snippet": "Target release date was finalized for October 29, 2024...",
      "score": 1.9
    }
  ],
  "searchMetadata": {
    "searched": true,
    "query": "Fedora Linux 41 release date",
    "resultCount": 2
  },
  "createdAt": "2024-11-13T17:40:00.000Z"
}
```

---

## 4. Frontend Rendering

In `AssistantMessage.tsx` and `CitationBadge.tsx`:
1. **Inline Marker Badges**: The markdown renderer converts text like `[1]` into clickable micro-badges that open the source URL in a new tab.
2. **Web Indicator**: Messages grounded with search display a `Web` badge alongside the model tag.
3. **Collapsible Source Cards**: An expandable section at the foot of each grounded message renders card previews with the site domain, title, snippet, and external link.
