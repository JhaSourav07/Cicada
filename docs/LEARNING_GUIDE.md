# CICADA Developer Learning Guide

Welcome to the engineering documentation for CICADA. This guide breaks down the core architecture, mental models, and software design decisions powering our local-first AI assistant.

---

## 1. What is the Next.js App Router?

Next.js App Router is built on modern React architecture (React Server Components and Suspense). Instead of the older Pages Router (`pages/index.tsx`), App Router uses a folder-based routing convention inside `src/app/`.

### Key Mechanics:
- **`layout.tsx`**: Defines persistent UI shells (like the dark theme wrapper and HTML headers) that persist state across navigation and never re-render unnecessarily.
- **`page.tsx`**: Represents the unique UI view for a given URL path (e.g., `/` maps to `src/app/page.tsx`).
- **`route.ts`**: Implements backend API Route Handlers running on Node.js on the server side (e.g., `src/app/api/chat/route.ts`).

---

## 2. Server Components vs. Client Components

In the App Router, **components are React Server Components (RSC) by default**.

### When to use Server Components:
- Data fetching directly from databases or backend services.
- Reading private environment variables (like `MONGODB_URI` or `OLLAMA_BASE_URL`).
- Reducing client JavaScript bundle sizes (Server Components execute once on the server and emit static HTML/JSON).

### When to use Client Components (`"use client"`):
- Interactivity: event listeners like `onClick`, `onChange`, `onKeyDown`.
- Browser-only APIs: `localStorage`, `window.addEventListener`, clipboard copy.
- React hooks: `useState`, `useEffect`, `useCallback`, `useRef`.

### CICADA's Phase 1 Architecture:
- `src/app/layout.tsx` is a **Server Component** providing the global HTML structure, fonts, and metadata.
- `src/app/page.tsx` renders the client-side chat shell (`ChatShell`), which is marked `"use client"` because chat interfaces require high-frequency user interactions, keyboard shortcuts, and reactive state updates.

---

## 3. Why Strict TypeScript?

We configure TypeScript with strict mode enabled (`"strict": true`, `"noImplicitAny": true`).

### Why this matters in CICADA:
1. **Domain Contract Integrity**: In an AI chat application, message payloads, role definitions (`user` vs `assistant` vs `system`), and status flags must never drift.
   ```typescript
   export type MessageRole = 'user' | 'assistant' | 'system';

   export interface Message {
     id: string;
     conversationId: string;
     role: MessageRole;
     content: string;
     createdAt: Date;
   }
   ```
2. **Refactoring Safety**: When we transition from Phase 1 (in-memory mock state) to Phase 3 (MongoDB persistence), having strict type contracts ensures the compiler will immediately highlight every location in the frontend that needs adjustment.

---

## 4. UI State Management in Phase 1

Instead of bringing in heavy external state management libraries (like Redux or Zustand) prematurely, Phase 1 uses an idiomatic, strongly-typed React Context and Custom Hook pattern (`src/components/chat/ChatContext.tsx` and `useChat`).

### The Mental Model:
1. **Single Source of Truth**: The active conversation ID, the list of conversations, and their messages are stored in memory in client state.
2. **Pure Reducer / Action Semantics**: State transitions are handled through clean action dispatches:
   - `createConversation()`
   - `selectConversation(id)`
   - `renameConversation(id, newTitle)`
   - `deleteConversation(id)`
   - `sendMessage(content)`
3. **Transparent Phase 1 Boundaries**: Because Ollama is not connected in Phase 1, `sendMessage()` records the user's message and displays a clear system feedback badge informing the user that the local inference engine connects in Phase 2.

---

## 5. How Future Layers Will Integrate

### A. Phase 2: Local AI Streaming (Ollama)
In Phase 2, `sendMessage` will make a `fetch()` request to `POST /api/chat`.
The route handler will call Ollama at `http://127.0.0.1:11434/api/generate` and stream response chunks back via a `ReadableStream` using Server-Sent Events (SSE). The client will consume this stream using an `AbortController`, appending tokens in real time.

### B. Phase 3: MongoDB Persistence
The state hook will replace in-memory array operations with server mutations (`fetch('/api/conversations')`). The component tree will remain completely identical.

### C. Phase 4: SearXNG Web Retrieval
When a user asks a question requiring current facts, the backend Route Handler will intercept the prompt, query SearXNG at `127.0.0.1:8080`, and inject retrieved citations into the prompt before passing it to Ollama.
