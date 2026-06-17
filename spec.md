# AI Answer Engine — Spec

## Product Opportunity Assessment

**What:** A minimal AI answer engine interface — a user types a query into a centered input, submits it with an up-arrow (↑) button, and a streamed AI response appears below. A single, calm, focused hero + answer page.

**Why:** Rapid prototype of an OpenRouter-connected answer surface with a crafted, distinctive visual identity (not a templated default).

**Success looks like:** User types a query, clicks ↑, and sees the response stream in word-by-word. Nothing else.

---

## Design Direction — "Reading Room"

> Crafted per the project design skills (`skills/frontend-design.md`, `skills/interface-design.md`, `skills/make-interfaces-feel-better.md`). wired-elements is NOT used.

**Intent:** A calm reading room. The person arrives with a question and wants a focused, literary answer experience — like sitting down with a knowledgeable correspondent. Feel: warm, quiet, considered.

**Palette (warm paper + ink, one ember accent):**
- `--paper` `#F7F4ED` — warm ivory canvas
- `--surface` `#FCFAF6` — raised sheet (input / answer), lifted by shadow, never pure white
- `--ink` `#211C16` — primary text (warm near-black, not pure black)
- `--ink-secondary` `#6B6358` — supporting text
- `--ink-muted` `#9C9285` — placeholder / metadata
- `--ember` `#B85C38` — single accent: send button, focus ring, streaming caret
- `--border` `rgba(33,28,22,0.10)` — hairline separation

**Typography (two families, deliberate):**
- **Fraunces** (serif, optical) — hero headline and answer body (literary voice)
- **Inter** (sans) — input text, button, small labels

**Depth:** Subtle layered shadows (approachable), committed throughout — not borders-only.

**Spacing:** 4px base unit; scale in multiples.

**Radius:** Concentric — answer sheet (large) > input field (medium) > send button (circular).

**Signature element:** A circular ember send disc bearing the ↑ glyph, paired with the answer rendering onto a warm raised "sheet" in Fraunces serif with a soft blinking ember caret while streaming.

**Quality floor (from skills):** Visible keyboard focus, `prefers-reduced-motion` respected, font smoothing on, `text-wrap: pretty` on answer body, scale-on-press (0.96) on the send button, contrast ≥ 4.5:1 for body text.

---

## Detailed Spec

### Architecture

```
┌─────────────────────────────────────┐
│         Browser (React/Vite)        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  HeroPage                   │   │
│  │   • hero headline (serif)   │   │
│  │   • query input + ↑ button  │   │
│  │   • answer sheet (streams)  │   │
│  └─────────────────────────────┘   │
└───────────────┬─────────────────────┘
                │ POST /api/chat (SSE stream)
┌───────────────▼─────────────────────┐
│         Express Server              │
│  - Reads OPENROUTER_API_KEY from .env│
│  - Proxies to OpenRouter API        │
│  - Streams SSE back to client       │
└───────────────┬─────────────────────┘
                │ POST https://openrouter.ai/api/v1/chat/completions
                │ model: openrouter/owl-alpha, stream: true
┌───────────────▼─────────────────────┐
│         OpenRouter API              │
└─────────────────────────────────────┘
```

### Components

**`HeroPage`** — the only page/component.
- Centered layout, full viewport height, warm paper canvas
- A hero headline in Fraunces serif (the calm thesis of the page)
- A raised input field for the query (Inter), with a circular ember **↑ send button** (no text label)
- An answer sheet that appears once a response starts streaming, rendering the streamed text in Fraunces serif with a soft ember caret
- Loading state: send button disabled + subtle activity indicator while waiting for the first token
- Error state: if the API call fails, the answer sheet shows the error message in the interface voice (what failed + that they can retry)

**`server/index.js`** — thin Express backend
- `POST /api/chat` — accepts `{ query: string }`, calls OpenRouter with `stream: true`, pipes SSE back to the client
- Loads `OPENROUTER_API_KEY` from `.env` at repo root via `dotenv`
- Never exposes the API key to the frontend

### Data Flow

1. User types query → clicks ↑ (or presses Enter)
2. React `fetch` POSTs `{ query }` to `/api/chat`
3. Express reads `.env`, POSTs to OpenRouter with `stream: true`
4. Express pipes OpenRouter's SSE stream back to the browser
5. React reads the stream chunk-by-chunk, appending each delta token to the answer sheet
6. Stream ends → send button re-enables

### Tech Stack

- **Frontend:** Vite + React 18 + TypeScript
- **Styling:** Hand-authored CSS with CSS custom properties (design tokens above). No Tailwind, no component library — full control for a distinctive identity.
- **Fonts:** Google Fonts (Fraunces, Inter) via `<link>` with `font-display: swap`
- **Backend:** Node.js + Express (minimal — proxy only). Native `fetch` (Node 24).
- **Dev:** Vite proxy routes `/api` → Express on port 3001; Vite serves on port 3000

### In Scope

- Single query → single streamed response
- Crafted "Reading Room" visual identity per the design skills
- API key kept server-side only
- Streaming SSE response rendering with a live caret
- Disabled / loading state on the send button
- Error display on API failure, in the interface voice
- Quality floor: keyboard focus, reduced-motion, contrast, scale-on-press

### Out of Scope (Parking Lot)

- Conversation history / multi-turn chat
- Model selector
- Markdown rendering of responses
- Authentication / user accounts
- Deployment / hosting
- Dark mode
- Copy-to-clipboard button
- Persistent storage

---

## Implementation Decisions Made During Development

- **2026-06-16 — Dropped wired-elements entirely.** The original hand-drawn design system was removed by the user mid-project and is now obsolete. Replaced with a crafted, hand-authored "Reading Room" identity (warm paper + ink, Fraunces/Inter, single ember accent) derived from the project design skills. Styling moved from a component library to hand-authored CSS + design tokens for full control and a non-templated result.
- **2026-06-16 — No CORS / no extra deps.** Because Vite proxies `/api` to Express same-origin, no CORS middleware is needed; server deps are just `express` + `dotenv` (native `fetch` on Node 24).
- **2026-06-16 — Answers render as plain text (markdown not parsed).** `owl-alpha` sometimes emits markdown (e.g. `**Paris**`); we render it verbatim in the serif body. Markdown rendering remains out of scope (parking lot), consistent with the bare-bones brief.
- **2026-06-16 — Restored a missing `.env`.** The repo-root `.env` was absent in the resumed working copy; it was recreated with the project's `OPENROUTER_API_KEY` so the server can authenticate. `.gitignore` keeps it out of version control.
