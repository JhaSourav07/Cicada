# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, React, TypeScript (strict mode), Tailwind CSS, shadcn/ui.

## Users

Software engineer and technical product owner working locally on Fedora Linux. The user needs an intelligent, private, local-first conversational AI assistant with fast local inference, persistent context, document understanding, and automatic search retrieval.

## Product Purpose

CICADA is a local-first personal AI assistant running entirely on the user's laptop. It provides a serious, distraction-free conversational workspace powered by local models (Ollama / Qwen 2.5 9B 32k) with planned integrations for local MongoDB persistence, private SearXNG search, document intelligence, and Telegram messaging. It opens directly to the chatbot interface—never a generic marketing page.

## Positioning

Unlike cloud-dependent commercial chatbots or bloated wrappers, CICADA is strictly private (bound to 127.0.0.1), resource-conscious (optimized for RTX 4060 8GB / 16GB RAM), and developer-centric. It pairs local zero-data-leakage inference with deep tool orchestration and transparent architectural control.

## Operating Context

- Desktop browser on Fedora Linux accessing `http://127.0.0.1:3000`.
- Local inference server: Ollama at `http://127.0.0.1:11434`.
- Hardware limits: 16GB system RAM, 8GB VRAM (requiring tight memory hygiene and bounded streaming buffers).
- Future private microservices: MongoDB (27017), SearXNG (8080).

## Capabilities and Constraints

- Capabilities (Phase 1): Conversational chat UI, multi-turn dialogue management, responsive collapsible sidebar, conversation search/rename/delete, markdown and code block rendering, message actions, multiline auto-resizing composer.
- Phase 1 Constraints: No backend or database connected yet. Client-side state only. No fake LLM simulations; the UI explicitly communicates disconnected state until Phase 2.
- Privacy Constraints: Never expose internal service URLs via NEXT_PUBLIC_ variables. Bind strictly to localhost.

## Brand Commitments

- Visual tone: Charcoal-black interface, dark neutral surfaces, crisp white typography, muted gray secondary typography, subtle 1px borders, clean spacing, restrained transitions.
- Persona: Serious, precise, high-craft developer tool (Linear / Vercel aesthetic without brand cloning). Zero purple AI gradients, zero glowing neon cards, zero gimmicky glassmorphism.

## Evidence on Hand

- Verified local Ollama model: `qwen3.5-9b-32k:latest`.
- Working directory: `/run/media/sourav/New Volume/Projects/Cicada`.

## Product Principles

1. Local-First and Private: User data and inference stay on machine 127.0.0.1; no telemetry or cloud leaks.
2. Software-Grade Craft: Clean component boundaries, predictable state, strict type safety, no mock hacks.
3. Clarity over Decoration: Every pixel, border, and animation serves readability and task focus.
4. Incremental Architecture: Build modular layers that expand without requiring UI rewrites.

## Accessibility & Inclusion

- WCAG 2.1 AA contrast ratios on dark backgrounds.
- Full keyboard navigation for composer (Enter to send, Shift+Enter for newline) and dialogs.
- Screen-reader friendly semantic landmarks and aria labels.
