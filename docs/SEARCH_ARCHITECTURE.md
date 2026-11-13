# CICADA Search Architecture

This document describes the design, end-to-end dataflow, and component interactions of CICADA's Phase 4 local retrieval-augmented search infrastructure.

---

## 1. High-Level System Architecture

CICADA integrates privacy-preserving metasearch with local generative AI. The browser never communicates with external networks or search engines directly. All retrieval, normalization, ranking, and context injection happen server-side on the Fedora host via loopback (`127.0.0.1`).

```
Browser (React / Next.js)
  │
  │ SSE POST /api/chat
  ▼
Next.js App Router (Route Handler)
  │
  ▼
AI Orchestrator (orchestrator.ts)
  ├── 1. Resolve / Create MongoDB Conversation
  ├── 2. Persist Incoming User Message
  ├── 3. Evaluate Search Heuristics (search-decision.ts)
  │      ├─ False ──► Skip retrieval
  │      └─ True  ──► Build contextual query (query-builder.ts)
  │                     │
  │                     ▼
  │                   SearXNG Metasearch (127.0.0.1:8080)
  │                     │
  │                     ▼
  │                   Result Normalizer (result-normalizer.ts)
  │                     │
  │                     ▼
  │                   Scoring & Domain Diversity (result-ranking.ts)
  │                     │
  │                     ▼
  │                   Bounded Context Formatter (search-context.ts)
  │
  ├── 4. Assemble Bounded Context (System Prompt + History + Search Block)
  ├── 5. Stream Tokens from Local Ollama (qwen3.5:9b)
  ├── 6. Post-Process & Validate Citation Markers (citations.ts)
  ├── 7. Persist Assistant Response & Sources to MongoDB
  │
  ▼ SSE Stream Events
Browser UI (renders interactive citations & source cards)
```

---

## 2. Component Breakdown

| Component | File Path | Responsibilities |
| :--- | :--- | :--- |
| **Search Config** | `src/lib/search/config.ts` | Loopback URL, timeouts, max results, scoring weights |
| **SearXNG Client** | `src/lib/search/searxng.ts` | Resilient HTTP client, JSON parser, ping health check |
| **Decision Engine** | `src/lib/search/search-decision.ts` | Deterministic heuristics: freshness, market, code skips |
| **Query Builder** | `src/lib/search/query-builder.ts` | Conversational pronoun resolution, PII stripping |
| **Result Normalizer** | `src/lib/search/result-normalizer.ts` | URL deduplication, HTML entity decoding, sanitization |
| **Result Ranking** | `src/lib/search/result-ranking.ts` | BM25-style lexical scoring, domain diversity cap |
| **Context Formatter** | `src/lib/search/search-context.ts` | Delimited evidence block with prompt-injection fences |
| **Citation Validator** | `src/lib/search/citations.ts` | Marker validation `[N]`, hallucination filtering |
| **UI Components** | `src/components/chat/CitationBadge.tsx` | Interactive inline citation links and source cards |

---

## 3. End-to-End Execution Sequence

```sequence
User->>Frontend: Enter prompt ("What is the latest release date of Fedora 41?")
Frontend->>ChatAPI: POST /api/chat { message, searchMode: "auto" }
ChatAPI->>Orchestrator: initializeChatSession()
Orchestrator->>MongoDB: Persist user message & fetch recent history
Orchestrator->>DecisionEngine: decideSearch(prompt, history)
DecisionEngine-->>Orchestrator: { shouldSearch: true, reason: "freshness" }
ChatAPI-->>Frontend: event: search_started { query: "Fedora 41 release date" }
Orchestrator->>SearXNG: GET /search?q=Fedora+41+release+date&format=json
SearXNG-->>Orchestrator: Raw JSON engine results
Orchestrator->>Normalizer: Deduplicate URLs, clean tracking parameters
Orchestrator->>Ranker: Rank by title/snippet score & apply domain diversity
Orchestrator->>ContextBuilder: Format delimited [SEARCH RESULTS] block
ChatAPI-->>Frontend: event: search_completed { resultCount: 5 }
ChatAPI-->>Frontend: event: sources { sources: [...] }
Orchestrator->>Ollama: POST /api/chat (stream: true)
Ollama-->>ChatAPI: Token stream ("Fedora 41 was released on October 29, 2024 [1]...")
ChatAPI-->>Frontend: event: token
ChatAPI->>CitationValidator: validateCitations(text, sources)
ChatAPI->>MongoDB: Persist assistant message with sources & searchMetadata
ChatAPI-->>Frontend: event: done
```

---

## 4. Latency Budgeting & Performance

| Stage | Target Duration | Typical Measured (Local NVMe / Podman) |
| :--- | :--- | :--- |
| MongoDB Session Initialization | < 15ms | ~5ms |
| Heuristic Search Evaluation | < 2ms | ~0.5ms |
| Query Rewriting & Normalization | < 5ms | ~1ms |
| Local SearXNG Search (Upstream engines) | 800ms - 2500ms | ~1200ms |
| Result Normalization & Ranking | < 10ms | ~2ms |
| Ollama Time-to-First-Token (TTFT) | < 300ms | ~150ms |
| Ollama Generation Speed | > 35 tok/s | ~42 tok/s on RTX 4060 |
| Total Turnaround for Grounded Query | 2.5s - 4.5s | ~3.2s |
