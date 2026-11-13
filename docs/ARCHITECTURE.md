# CICADA System Architecture

## 1. System Overview

CICADA is a local-first personal AI assistant built for private, offline-capable, high-performance developer workflows on Linux. All core services bind strictly to `127.0.0.1` (localhost) to guarantee zero data leakage to external networks.

```
+-------------------------------------------------------------------------+
|                              LOCAL HOST                                 |
|                                                                         |
|  +--------------------+                     +------------------------+  |
|  |   Browser Client   | <=== HTTP / SSE ==> |   Next.js App Server   |  |
|  | (127.0.0.1:3000)   |                     |   (127.0.0.1:3000)     |  |
|  +--------------------+                     +-----------+------------+  |
|                                                         |               |
|            +-------------------+------------------------+               |
|            |                   |                        |               |
|            v                   v                        v               |
|  +------------------+  +------------------+  +----------------------+   |
|  |   Ollama LLM     |  |     MongoDB      |  |   SearXNG Engine     |   |
|  | (127.0.0.1:11434)|  | (127.0.0.1:27017)|  |   (127.0.0.1:8080)   |   |
|  +------------------+  +------------------+  +----------+-----------+   |
|                                                         |               |
+---------------------------------------------------------|---------------+
                                                          | (Outbound only)
                                                          v
                                               External Search Providers
```

---

## 2. Service Boundary & Port Allocation

| Service | Port / Address | Responsibility | Exposure Policy |
| :--- | :--- | :--- | :--- |
| **Next.js Web & API** | `127.0.0.1:3000` | UI shell, route handlers, SSE streaming orchestration | Loopback only |
| **Ollama Inference** | `127.0.0.1:11434` | Local LLM inference (`qwen3.5-9b-32k`) | Loopback only |
| **MongoDB Persistence** | `127.0.0.1:27017` | Conversations, messages, tool execution logs | Loopback only |
| **SearXNG Search** | `127.0.0.1:8080` | Privacy-respecting meta-search proxy | Loopback only |

> [!IMPORTANT]
> Internal service addresses are strictly hidden from browser clients. No service URL or credential is prefixed with `NEXT_PUBLIC_`. The Next.js backend serves as a secure gateway for all AI, database, and search interactions.

---

## 3. Directory Layout & Boundaries

```
src/
├── app/                  # Next.js App Router (Layouts, Pages, Route Handlers)
│   ├── api/              # Backend Route Handlers (Phase 2+)
│   ├── globals.css       # Global design system variables & Tailwind base
│   ├── layout.tsx        # Application root layout with dark theme
│   └── page.tsx          # Main chat view
├── components/           # UI Components
│   ├── chat/             # Chat window, composer, messages, empty states
│   ├── sidebar/          # Navigation, conversation list, search, actions
│   ├── settings/         # Diagnostics, hardware info, model selection
│   └── ui/               # Primitive controls (buttons, inputs, modals, icons)
├── lib/                  # Business logic & service adapters (isolated)
│   ├── ai/               # Ollama client, prompt templates, stream parser
│   ├── search/           # SearXNG client, ranking, query builder
│   ├── db/               # Native MongoDB client & repositories
│   └── validation/       # Zod schemas for requests & payloads
└── types/                # Canonical TypeScript domain models
```

---

## 4. Phase 1 Frontend Component Hierarchy

```
RootLayout
└── ChatShell
    ├── AppSidebar (Desktop persistent, Mobile collapsible drawer)
    │   ├── SidebarHeader (CICADA branding, New Chat trigger)
    │   ├── SearchInput (Filter active/recent conversation list)
    │   ├── ConversationList
    │   │   └── ConversationItem (Title, timestamp, rename/delete actions)
    │   └── SidebarFooter (Settings drawer trigger, system status)
    │
    └── MainChatArea
        ├── ChatHeader (Model badge: qwen3.5-9b-32k, connection status)
        ├── ChatWindow
        │   ├── EmptyState (Greeting, capabilities overview, keyboard shortcuts)
        │   └── MessageList (Auto-scroll to bottom, copy action)
        │       ├── UserMessage (Avatar, content bubble, timestamp)
        │       └── AssistantMessage (Markdown formatting, code highlighting, copy button)
        ├── StatusBanner (Phase 1 explicit: AI disconnected indicator)
        └── ChatComposer (Auto-resize textarea, send button, shortcut listener)
```

---

## 5. Architectural Contracts for Future Phases

### Phase 2: AI Streaming Contract
The frontend expects a Server-Sent Events (SSE) stream from `POST /api/chat`.
- The client dispatches `{ conversationId, message, model }`.
- The server streams chunks: `data: {"type": "chunk", "text": "..."}\n\n`.
- The client appends chunks directly into the active assistant message without re-renders of the full history.

### Phase 3: Persistence Contract
Data access will be handled via server-side repositories (`lib/db/conversation.repository.ts` and `lib/db/message.repository.ts`) using the official `mongodb` driver. The client will communicate with RESTful endpoints (`GET /api/conversations`, `POST /api/conversations`, `PATCH /api/conversations/[id]`, `DELETE /api/conversations/[id]`).

### Phase 4: Search Augmentation Contract
SearXNG will run on `127.0.0.1:8080`. An autonomous decision layer (`lib/search/decision.ts`) will evaluate if the prompt requires live internet data, query SearXNG server-side, normalize citations, and inject relevant context into the Qwen context window.
