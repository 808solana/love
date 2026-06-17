# Answer Engine

A minimal AI answer engine with a crafted **"Reading Room"** interface: type a question, press ↑, and a streamed answer renders onto a warm "sheet." Built with Vite + React + TypeScript on the front, a thin Express proxy on the back, and OpenRouter (`openrouter/owl-alpha`) for answers.

> Design and requirements live in **`spec.md`** (source of truth). Implementation order is in **`plan.md`**. Working conventions are in **`AGENTS.md`**.

---

## Current Status

**All phases complete — fully working.**

What works right now:
- Crafted "Reading Room" UI (warm paper + ink, Fraunces/Inter, single ember accent)
- Type a question → press ↑ (or Enter) → answer **streams in** token-by-token on the answer sheet
- Loading "thinking" indicator, disabled send button while streaming, error messages in the interface voice
- API key stays server-side (read from `.env`, never sent to the browser)

**Try it:** start both servers (below), open `http://localhost:3000`, type *"What is the capital of France?"* and press ↑.

---

## Prerequisites

- Node.js 20.11+ (developed on Node 24; uses native `fetch` and `import.meta.dirname`)
- An OpenRouter API key in `.env` at the repo root:

```
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

(Copy `.env.example` to `.env` and fill it in. `.env` is gitignored.)

---

## Install

```bash
# Frontend
cd app && npm install

# Backend
cd ../server && npm install
```

## Run

Run each in its own terminal:

```bash
# Terminal 1 — Express proxy (port 3001)
cd server
node index.js
# → [SERVER] running on 3001

# Terminal 2 — Vite dev server (port 3000)
cd app
npm run dev
# → Local: http://localhost:3000
```

Then open **http://localhost:3000**.

> Note: the proxy server must be running before you submit a question — the browser talks to `/api/chat`, which Vite proxies to the Express server on 3001.

---

## Project Structure

```
love/
├── spec.md           Requirements + "Reading Room" design direction
├── plan.md           Phased implementation plan
├── AGENTS.md         How to work in this repo (read first)
├── TESTING.md        Manual QA steps
├── .env              OPENROUTER_API_KEY (gitignored)
├── app/              Vite + React + TypeScript frontend
│   └── src/
│       ├── HeroPage.tsx   The single page (UI + streaming)
│       └── index.css      Design tokens + styles
└── server/
    └── index.js      Express proxy: POST /api/chat → OpenRouter SSE
```

## How It Works

1. The browser POSTs `{ query }` to `/api/chat`.
2. Vite proxies that to the Express server on port 3001.
3. Express calls OpenRouter with `stream: true` and pipes the Server-Sent Events stream straight back.
4. The React app reads the stream, parses each `data:` chunk, and appends `delta.content` tokens to the answer in real time, stopping at `data: [DONE]`.

## Out of Scope (parking lot)

Multi-turn chat, model selector, markdown rendering, auth, persistence, dark mode, deployment.
