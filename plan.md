# AI Answer Engine — Implementation Plan

> Reference spec: `spec.md` (includes the "Reading Room" design direction — source of truth)

---

## Open Questions

None — all decisions resolved in the spec. (wired-elements is obsolete and removed.)

---

## Tasks

### Phase 0: Project Scaffolding & Setup
☑ Scaffold Vite + React + TypeScript project in `app/`
☑ Scaffold Express server in `server/` with `dotenv` + `express` (native fetch, Node 24)
☑ Configure Vite proxy: `/api` → `http://localhost:3001`
☑ Confirm both processes start without errors (Vite on 3000, Express on 3001)

### Phase 1: Static UI Shell ("Reading Room")
☑ Add design tokens (CSS custom properties from spec) + Google Fonts (Fraunces, Inter) in `app/src/index.css`
☑ Create `app/src/HeroPage.tsx`: hero headline, raised query input, circular ember ↑ send button, placeholder answer sheet (no logic yet)
☑ Apply quality floor: focus rings, font smoothing, reduced-motion guard, scale-on-press on send
☑ Confirm the crafted UI renders centered and on-brand in the browser

### Phase 2: Backend Proxy
☑ Implement `POST /api/chat` in `server/index.js` — accepts `{ query }`, calls OpenRouter with `stream: true`, pipes SSE back to client
☑ Load `OPENROUTER_API_KEY` from `.env` at repo root via dotenv
☑ Manually test the endpoint streams tokens (verified: streamed "Hello there, friend!" then `[DONE]`)

### Phase 3: Frontend Streaming Integration
☑ Wire submit handler in `HeroPage.tsx` — POST to `/api/chat`, read SSE stream, append tokens to state
☑ Reveal the answer sheet on first token; show activity indicator while waiting
☑ Disable the ↑ button during streaming; re-enable on completion or error
☑ Display API errors in the answer sheet, in the interface voice
☑ End-to-end test: type a query, submit, confirm streaming response renders (verified in browser: "What is the capital of France?" → streamed answer on the sheet)

---

## Phase 0: Project Scaffolding & Setup

**Affected Files:**
- `app/` (new) — Vite + React + TypeScript project
- `app/vite.config.ts` (new) — proxy `/api` → `http://localhost:3001`, dev server on port 3000
- `server/` (new) — Express proxy server
- `server/package.json` (new) — deps: express, dotenv
- `server/index.js` (new) — skeleton Express app, listens on port 3001

**Goal:** Both processes boot cleanly and the proxy route is wired up.

**Done means:**
- `npm run dev` in `app/` starts Vite on port 3000 with no errors
- `node index.js` in `server/` starts Express on port 3001 with no errors

**Test it:**
1. In `server/`, start Express → expect "[SERVER] running on 3001"
2. In `app/`, start Vite → expect "Local: http://localhost:3000"
3. Open `http://localhost:3000` → default page, no console errors

---

## Phase 1: Static UI Shell ("Reading Room")

**Affected Files:**
- `app/index.html` — add Google Fonts links (Fraunces, Inter), page title
- `app/src/index.css` — design tokens (CSS custom properties), global reset, font smoothing, base type
- `app/src/HeroPage.tsx` (new) — full crafted layout, static only
- `app/src/App.tsx` — render `<HeroPage />`
- `app/src/main.tsx` — entry (default Vite)

**Goal:** The "Reading Room" UI is visible and on-brand — no logic, no API calls.

**Done means:**
- Warm paper canvas, Fraunces hero headline, raised input field, circular ember ↑ send button, placeholder answer sheet
- Layout centered; type scale and spacing feel intentional
- Keyboard focus visible; send button scales on press; no console errors

**Test it:**
1. Start Vite: `npm run dev` in `app/`
2. Open `http://localhost:3000`
3. Confirm the crafted layout renders; tab to the input/button to verify focus rings; press the send button to feel the scale

---

## Phase 2: Backend Proxy

**Affected Files:**
- `server/index.js` — implement `POST /api/chat`: read `query`, POST to OpenRouter `chat/completions` with `stream: true`, pipe SSE back; load key via dotenv from repo-root `.env`

**Goal:** `/api/chat` streams tokens from OpenRouter back to any HTTP client.

**Done means:**
- Server reads `OPENROUTER_API_KEY` from `.env` on startup
- `POST /api/chat` with `{ "query": "hello" }` returns a streamed SSE response from `openrouter/owl-alpha`, ending with `data: [DONE]`

**Test it:**
1. Start Express: `node index.js` in `server/`
2. Run: `curl -X POST http://localhost:3001/api/chat -H "Content-Type: application/json" -d "{\"query\":\"say hello\"}" --no-buffer`
3. Expect SSE lines streaming token deltas, ending with `data: [DONE]`

---

## Phase 3: Frontend Streaming Integration

**Affected Files:**
- `app/src/HeroPage.tsx` — submit handler, SSE stream reader, state for `response` / `loading` / `error`; reveal answer sheet, activity indicator, disabled button, error display

**Goal:** Typing a query and clicking ↑ streams the AI response into the answer sheet in real time.

**Done means:**
- Clicking ↑ (or Enter) disables the button and shows activity
- First token reveals the answer sheet; text appends token-by-token with the ember caret
- Button re-enables after the stream ends
- API failure shows an error message in the answer sheet, in the interface voice

**Test it:**
1. Start both servers
2. Open `http://localhost:3000`
3. Type "What is the capital of France?" → click ↑ → confirm button disables + activity shows
4. Confirm the answer streams in word-by-word on the sheet
5. Confirm the button re-enables when streaming completes
6. Stop Express, submit again → confirm an error message appears in the sheet
