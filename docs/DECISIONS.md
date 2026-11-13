# Architectural Decision Records (ADRs)

This document records the foundational technical and architectural decisions for CICADA.

---

## ADR-001: Next.js App Router for Unified Full-Stack Architecture
- **Status**: Accepted
- **Context**: CICADA requires a high-performance modern web interface and an integrated backend gateway to orchestrate local LLMs, search engines, and databases.
- **Decision**: Use Next.js with App Router.
- **Consequences**:
  - Eliminates the operational complexity of maintaining separate frontend and backend servers.
  - Provides native Server-Sent Events (SSE) support via Route Handlers for LLM token streaming.
  - Server components keep secrets and service URLs strictly off the browser client.
  - Zero premature microservice overhead.

---

## ADR-002: Strict Loopback Binding (`127.0.0.1`) for Local Privacy
- **Status**: Accepted
- **Context**: CICADA is a private personal assistant processing sensitive personal documents and conversations on a Fedora laptop.
- **Decision**: All services (Next.js, Ollama, MongoDB, SearXNG) must bind explicitly to `127.0.0.1`.
- **Consequences**:
  - No access allowed from other devices on the LAN or public internet.
  - No sensitive URLs or configuration exposed through `NEXT_PUBLIC_` environment variables.
  - The Next.js server acts as the solitary trusted gateway.

---

## ADR-003: Pure In-Memory Client State for Phase 1 UI
- **Status**: Accepted
- **Context**: Phase 1 scope focuses on frontend foundations, responsive layouts, and user interactions before backend persistence is wired up.
- **Decision**: Use clean client-side React state without fake mock backends or simulated AI responses.
- **Consequences**:
  - Avoids throwaway mock API code that must later be refactored.
  - Clearly communicates to the user that AI inference is disconnected in Phase 1.
  - The state layer uses clean interfaces that effortlessly swap to real API hooks in Phase 2 and 3.

---

## ADR-004: Direct Native MongoDB Driver (No Prisma / No Heavy ORM)
- **Status**: Accepted
- **Context**: MongoDB will provide conversation and message persistence starting in Phase 3.
- **Decision**: Use the official `mongodb` Node.js driver directly with repository pattern abstractions.
- **Consequences**:
  - Zero code generation overhead or schema migration friction inherent in heavy ORMs.
  - Direct control over connection pooling, atomic updates, and indexing.
  - Extremely lightweight footprint on system memory (16GB hardware constraint).

---

## ADR-005: Developer-Tool Visual System (Linear/Vercel Aesthetic) via Tailwind CSS
- **Status**: Accepted
- **Context**: Visual quality is a core product requirement. The UI must feel like a serious, professional developer tool.
- **Decision**: Standardize on a charcoal-black palette, subtle 1px border dividers, high-contrast typography, and zero decorative AI fluff (no purple gradients, no glassmorphic blur traps, no neon cards).
- **Consequences**:
  - Maximum scanability and zero visual distraction during long coding/chat sessions.
  - Low GPU compositor overhead on Linux/Wayland compared to heavy CSS blur filters.
  - Consistent tokenization documented in [DESIGN.md](../DESIGN.md).
