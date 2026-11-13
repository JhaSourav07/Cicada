# Search Decision Engine

This document explains the design, algorithms, and heuristic rules of CICADA's Search Decision Engine (`src/lib/search/search-decision.ts`).

---

## 1. Design Rationale: Heuristics vs. LLM Evaluator

A common architecture in modern AI systems is to ask the LLM: *"Does this question need internet search?"*

While flexible, using an LLM call for search classification introduces critical drawbacks:
1. **Latency Penalty**: An LLM round-trip takes 300ms–1500ms before search can even begin.
2. **Context Fragmentation**: Consumes VRAM and inference slots on the local GPU.
3. **Non-Deterministic Behavior**: Small variations in temperature can cause inconsistent classification.

CICADA employs a **deterministic, sub-millisecond heuristic decision engine**:
- **Execution Time**: `< 0.5 ms`
- **Zero VRAM / Zero GPU Load**
- **100% Deterministic & Unit-Testable**
- **User Override Control**: `auto`, `on`, `off` modes.

---

## 2. Decision Logic Hierarchy

The decision engine evaluates the user prompt through an ordered series of rules:

```
User Prompt & Mode
  │
  ├─ 1. Manual Override?
  │      ├─ "off"  ──► STOP: Do not search
  │      └─ "on"   ──► PROCEED: Force search
  │
  ├─ 2. Explicit User Directive?
  │      ├─ "don't search", "no internet" ──► STOP
  │      └─ "search for", "google this"   ──► PROCEED
  │
  ├─ 3. Static Knowledge Filter?
  │      ├─ Code, syntax, algorithm, math, poetry
  │      └─ AND no temporal freshness keyword ──► STOP
  │
  ├─ 4. Freshness & Real-Time Triggers?
  │      ├─ Current year (2024, 2025, 2026), "latest", "news", "today"
  │      ├─ Live markets ("price", "stock", "usd", "market cap")
  │      ├─ Events ("weather", "election", "game score", "release date")
  │      └─ MATCH ──► PROCEED
  │
  └─ 5. Default Fallback
         └─ Internal knowledge cutoff sufficient ──► STOP
```

---

## 3. Pattern Rules & Heuristics

### A. Freshness Keywords (Trigger Search)
- Temporal markers: `latest`, `recent`, `today`, `yesterday`, `upcoming`, `current`, `released`, `changelog`
- Calendar years: `2024`, `2025`, `2026`
- Live data: `price`, `stock`, `weather`, `sports score`, `status`, `market cap`

### B. Static Knowledge Concepts (Bypass Search)
- Algorithms: `binary search`, `quicksort`, `bfs`, `dfs`, `bubble sort`
- Computer science fundamentals: `recursion`, `polymorphism`, `mutex`, `regex`, `closures`
- Language tutorials: `how to write a loop in python`, `type annotations in typescript`
- Mathematical operations: `calculate`, `derivative`, `integral`, `solve for x`

### C. Conversational Context Resolution
When a user asks a follow-up such as *"When was it released?"*, the engine inspects recent dialogue history to resolve the subject matter before classifying freshness.
