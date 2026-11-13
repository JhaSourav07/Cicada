# CICADA Development Roadmap

Target Total Commits: ~58 meaningful commits across 7 phases.

---

## Phase 1 — Project Foundation & Chat Interface (~8 commits)
**Status: In Progress**
Focus: Establishing strict project scaffolding, high-craft dark UI, responsive shell, conversational state, and clean component architecture.
- Commit 1: `chore(repo): initialize git repository and project ignore rules`
- Commit 2: `docs(architecture): add project specification, architecture, phases, and learning guide`
- Commit 3: `chore(setup): scaffold Next.js App Router with TypeScript and Tailwind CSS`
- Commit 4: `feat(design): implement design system tokens and base layout shell`
- Commit 5: `feat(sidebar): build responsive sidebar with conversation management`
- Commit 6: `feat(chat): build chat window, message rendering, and composer`
- Commit 7: `feat(state): integrate reactive conversation state and settings panel`
- Commit 8: `test(ui): verify build, types, linting, accessibility, and design quality`

---

## Phase 2 — Local AI Integration (~9 commits)
**Status: Planned**
Focus: Connecting Ollama inference (`qwen3.5-9b-32k`), SSE streaming, context sliding window, and error handling.
- Milestone 1: Ollama native client wrapper and health probe (`lib/ai/ollama.ts`).
- Milestone 2: Model configuration and validation schemas (`lib/ai/models.ts`).
- Milestone 3: Route handler `POST /api/chat` with Server-Sent Events (SSE).
- Milestone 4: Prompt template management and system instructions.
- Milestone 5: Conversation context builder with token budget bounds.
- Milestone 6: Client-side SSE consumption hook (`useChatStream`).
- Milestone 7: Client cancellation and abort controller integration.
- Milestone 8: Model offline, out-of-memory, and timeout recovery.
- Milestone 9: End-to-end local inference integration verification.

---

## Phase 3 — MongoDB Persistence (~8 commits)
**Status: Planned**
Focus: Transitioning from in-memory state to local MongoDB storage using the native Node.js driver.
- Milestone 1: MongoDB singleton connection pool (`lib/db/client.ts`).
- Milestone 2: Conversation document schema and indexes (`lib/db/schemas/conversation.ts`).
- Milestone 3: Message document schema and compound indexes (`lib/db/schemas/message.ts`).
- Milestone 4: Repository layer for CRUD operations (`lib/db/repositories/`).
- Milestone 5: REST API Route handlers (`/api/conversations`).
- Milestone 6: REST API Route handlers for conversation messages (`/api/conversations/[id]/messages`).
- Milestone 7: Client data synchronization and optimistic updates.
- Milestone 8: Persistence regression tests and indexing benchmark.

---

## Phase 4 — Automatic Internet Search (~9 commits)
**Status: Planned**
Focus: Privacy-respecting meta-search retrieval via SearXNG with automatic retrieval decision.
- Milestone 1: SearXNG client adapter (`lib/search/searxng.ts`).
- Milestone 2: LLM search decision engine (determining when internet access is required).
- Milestone 3: Search query formulation and synonym expansion.
- Milestone 4: Result fetching, deduplication, and domain filtering.
- Milestone 5: Relevance scoring and content ranking.
- Milestone 6: Search context injection into Qwen prompt window.
- Milestone 7: Citation schema and UI badge links (`components/chat/CitationBadge.tsx`).
- Milestone 8: Search fallback and offline graceful degradation.
- Milestone 9: End-to-end retrieval augmented generation (RAG) test.

---

## Phase 5 — Reliability, Security & Hardening (~8 commits)
**Status: Planned**
Focus: Defensive system programming, Zod validation, prompt defense, and localhost throttling.
- Milestone 1: Comprehensive Zod request payload validation on all routes.
- Milestone 2: Localhost rate limiting and concurrent task throttling.
- Milestone 3: Input sanitization and XSS prevention for user & assistant markdown.
- Milestone 4: Prompt injection guardrails and delimiter isolation.
- Milestone 5: Structured JSON logging with trace correlation.
- Milestone 6: Global error boundaries and API error normalization.
- Milestone 7: Unit and integration test suites.
- Milestone 8: Memory audit and streaming buffer performance benchmarks.

---

## Phase 6 — Document Intelligence, Files & Tools (~8 commits)
**Status: Planned**
Focus: Local document processing (PDF, text, code), tool registry, and execution controls.
- Milestone 1: Local file upload handling and checksum validation.
- Milestone 2: PDF and plain text extraction engine.
- Milestone 3: Document chunking and in-memory semantic indexing.
- Milestone 4: Extensible tool registry specification.
- Milestone 5: Permission gating and user approval prompts for tool execution.
- Milestone 6: Custom skill loader and runtime sandbox.
- Milestone 7: Tool execution UI status cards in chat feed.
- Milestone 8: Comprehensive skill integration testing.

---

## Phase 7 — Telegram Integration (~8 commits)
**Status: Planned**
Focus: Native bot interface using grammY connecting to the unified CICADA engine.
- Milestone 1: grammY bot setup and webhook/polling lifecycle.
- Milestone 2: Bot authentication and allowed-user whitelist (strict security).
- Milestone 3: Shared chat engine binding between web UI and Telegram.
- Milestone 4: Telegram message streaming via editMessageText.
- Milestone 5: User and conversation mapping between Telegram and MongoDB.
- Milestone 6: Telegram document and voice note ingestion stub.
- Milestone 7: Error handling and connection disconnect recovery.
- Milestone 8: Comprehensive Telegram end-to-end integration tests.
