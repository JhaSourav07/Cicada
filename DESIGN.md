# CICADA Design System

<!-- impeccable:design-tokens -->

## 1. Design Direction & Visual Philosophy

CICADA employs an **Operate**-mode design language: precision, scanability, and restraint outrank decorative expression. It draws inspiration from premier developer tools like Linear and Vercel—utilizing crisp charcoal neutrals, purposeful hierarchy, and 1px borders without artificial visual noise.

### Explicit Anti-Patterns (Forbidden)
- **No purple AI gradients**: No rainbow glows, aurora fills, or saturated magenta highlights.
- **No excessive glassmorphism**: Solid, high-contrast dark neutrals instead of washed-out backdrop blurs.
- **No neon accent overload**: Accent states are reserved for functional feedback (e.g. active states, focus rings).
- **No generic landing page tropes**: CICADA opens directly into the functional workspace.

---

## 2. Color Palette & Surfaces

| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg-canvas` | `#09090b` | Base application background (deep charcoal black) |
| `--bg-surface` | `#121316` | Sidebar, header, and primary card backgrounds |
| `--bg-surface-elevated` | `#18191e` | Dropdowns, dialogs, active selection containers |
| `--bg-surface-hover` | `#1f2026` | Interactive hover states on list items and buttons |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Standard 1px divider and structural borders (`#27272a`) |
| `--border-strong` | `rgba(255, 255, 255, 0.16)` | Active input borders, focus outlines (`#3f3f46`) |
| `--text-primary` | `#f4f4f5` | High-emphasis headings, messages, active labels |
| `--text-secondary` | `#a1a1aa` | Muted labels, timestamps, metadata, helper text |
| `--text-tertiary` | `#71717a` | Inactive placeholders, keyboard shortcut badges |
| `--accent-focus` | `#3b82f6` | Accessible keyboard focus indicator (subtle blue ring) |
| `--danger` | `#ef4444` | Destructive actions (Delete conversation) |

---

## 3. Typography

- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Monospace Family**: JetBrains Mono, Fira Code, ui-monospace, Menlo, Consolas, monospace.

| Scale | Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `text-xs` | 12px (0.75rem) | 1rem | 400 / 500 | Badges, timestamps, keyboard shortcuts |
| `text-sm` | 14px (0.875rem) | 1.25rem | 400 / 500 | Body copy, conversation list items, composer text |
| `text-base` | 16px (1.00rem) | 1.5rem | 400 | Chat message paragraphs |
| `text-lg` | 18px (1.125rem) | 1.75rem | 600 | Header titles, dialog titles |
| `text-xl` | 20px (1.25rem) | 1.75rem | 600 | Empty state heading |

---

## 4. Spacing, Borders & Radius

- **Border Radius**:
  - `rounded-md`: 6px (buttons, input fields, badges)
  - `rounded-lg`: 8px (dialogs, cards, message bubbles)
  - `rounded-xl`: 12px (application shell containers)
- **Spacing Units**: Strict 4px grid (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`).

---

## 5. Interaction & Motion

- Transitions: `transition-colors duration-150 ease-out`.
- Modals & Drawers: `transition-all duration-200 ease-out`.
- Hover Feedback: Subtle background lightness shift (`bg-surface-hover`) and crisp icon opacity transitions.
