# Project Agent Instructions

---

## Skills — Check First, Every Time

**Before starting any task, always check `@skills/` to see if a skill applies.**

Skills are dynamic — new ones may have been added since this file was written. Browse them before beginning work, and be current on what each does, what it's best for, and what it's NOT for. If a relevant skill exists, read and follow it immediately as your first action.

> "Does a skill exist for what I'm about to do?" → If yes, use it. If no, proceed normally.

Current skills and when they apply:
- **`skills/frontend-design.md`** — distinctive visual identity for new UI / hero pages. **Primary for this project's look.**
- **`skills/interface-design.md`** — craft of product/tool UI: design tokens, surface elevation, interaction states. Use for the input/answer surfaces.
- **`skills/make-interfaces-feel-better.md`** — polish: concentric radii, shadows-over-borders, scale-on-press, staggered enters, font smoothing. Use as the final pass.
- **`skills/ui-ux-pro-max.md`** — a11y/interaction/typography checklists (leans React-Native/mobile; has a Python CLI). Use its Quick Reference as a checklist, not as a build tool.
- **`skills/canvas-design.md`** — static art deliverables (`.png`/`.pdf`). NOT applicable to this web app.

---

## What This Project Is

A minimal AI answer engine UI. The user types a query, clicks ↑ (or presses Enter), and a streamed AI response renders onto a warm "sheet." A single, calm hero + answer page with a crafted **"Reading Room"** identity (warm paper + ink, Fraunces/Inter, single ember accent).

> **wired-elements is obsolete.** It was removed from this project and must never be reintroduced. Do not import, install, or reference it.

**Source of truth:** `../spec.md` (requirements + design direction) and `../plan.md` (implementation order).

---

## Codebase Map

```
love/
├── AGENTS.md           ← This file (you are here)
├── spec.md             ← Requirements, "Reading Room" design direction, architecture
├── plan.md             ← Phased implementation plan with tasks
├── skills/             ← Design skills — CHECK BEFORE ANY UI WORK
├── .env                ← API keys (gitignored — never commit)
├── .env.example        ← Safe placeholder (always commit)
├── app/                ← Vite + React + TypeScript frontend
│   ├── index.html      ← Google Fonts links (Fraunces, Inter), page title
│   └── src/
│       ├── main.tsx    ← Entry point
│       ├── App.tsx     ← Root component; renders HeroPage
│       ├── HeroPage.tsx← The only page: hero, query input, ↑ send, answer sheet
│       └── index.css   ← Design tokens (CSS custom properties) + global styles
└── server/             ← Thin Express proxy server
    └── index.js        ← POST /api/chat → OpenRouter SSE stream
```

---

## API Keys & Configuration

### OpenRouter
- **Key location:** `.env` at the repo root
- **Variable name:** `OPENROUTER_API_KEY`
- **Base URL:** `https://openrouter.ai/api/v1`
- **Model:** `openrouter/owl-alpha`
- **Key is already set** — do not commit `.env` (it is in `.gitignore`)

The server reads the key at startup via `dotenv`. The key must never reach the frontend — only the Express server touches it.

---

## Getting Started

### For a New AI Agent

Read these files in order before writing any code:
1. **This file** — map, purpose, and how to work here
2. **`skills/`** — be current on each design skill (see list above)
3. **`../spec.md`** — requirements + the "Reading Room" design direction
4. **`../plan.md`** — phased tasks and success criteria
5. **`README.md`** (once it exists) — current build status and how to run

Then: start both servers, find the current phase (unchecked `☐` in `plan.md`), continue, and update docs as you go.

---

## How to Run

```bash
# Terminal 1 — Express proxy server
cd server
node index.js
# Expected: "[SERVER] running on 3001"

# Terminal 2 — Vite dev server
cd app
npm run dev
# Expected: "Local: http://localhost:3000"
```

Open `http://localhost:3000` to use the app.

---

## Framework Critical Patterns

### Design system (CRITICAL)
- The look is **hand-authored CSS + design tokens** defined in `app/src/index.css`. There is no component library.
- Every color/spacing/radius value must trace back to a token (see spec). Don't introduce raw hex values in components.
- Honor the design skills: one ember accent only, subtle layered shadows (not borders-only), concentric radii, visible focus, `prefers-reduced-motion` respected.

### Vite + Express Proxy (CRITICAL)
- The Vite proxy in `vite.config.ts` routes `/api` → `http://localhost:3001` — **Express must be running before testing API calls from the browser.**
- If Express is down, the browser shows a proxy error, not a network error — don't mistake this for a frontend bug.
- After changing `vite.config.ts`, restart the Vite dev server.

### SSE Streaming (CRITICAL)
- OpenRouter sends `data: [DONE]` as the final SSE event — treat it as stream-end, not an error.
- Read the stream with `ReadableStream` + `TextDecoder` on the frontend; never call `response.json()` on a streaming response.
- A single network chunk may contain multiple or partial `data:` lines — buffer and split on newlines.

### Logging
- Format: `[HH:MM:SS] [PREFIX] message` — server `[SERVER]`, client `[CLIENT]`.
- The server also appends logs synchronously to `server/server.debug.log`, because Node buffers `stdout` when it's redirected to a file (detached process) and lines otherwise don't appear until the buffer flushes.

### Running long-lived servers in this environment (CRITICAL)
- Starting a server with the normal background shell mechanism is unreliable here: the reported PID is often a **PowerShell wrapper**, and killing it (or letting the tool background it) can leave an **orphaned child `node` still bound to the port** — which then serves stale code and intercepts requests.
- Launch servers **detached** with `Start-Process -PassThru` and redirect output to log files, e.g.
  `Start-Process node -ArgumentList "index.js" -WorkingDirectory <server> -RedirectStandardOutput server.out.log -RedirectStandardError server.err.log -WindowStyle Hidden -PassThru`.
  Vite the same way via `node node_modules/vite/bin/vite.js`.
- To restart cleanly, kill by **command line**, not the wrapper PID:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*index.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
- Always verify the new process actually owns the port: compare `$p.Id` to `(Get-NetTCPConnection -LocalPort 3001 -State Listen).OwningProcess`. Do NOT kill the Cursor TS-server or Azure MCP `node.exe` processes.

### `.env` can go missing on a fresh checkout (CRITICAL)
- The repo-root `.env` (and `.env.example`, `.gitignore`) are gitignored/untracked and were **absent** when this session resumed in a fresh working copy. If `dotenv` logs `injected env (0)`, the file is missing or unreadable — recreate `.env` with `OPENROUTER_API_KEY` (value is documented in the API Keys section / project config) and restart the server.

---

## Development Principles

- **YAGNI:** Build only what the spec describes. No features beyond the single query → streamed answer flow.
- **DRY:** One component (`HeroPage`), one endpoint (`/api/chat`).
- **Security:** API key lives only in `.env`, read only by Express. Never log it, never send it to the browser.
- **Explain as you go:** State assumptions explicitly, check in at natural breakpoints.

---

## Phase Wrap-Up Protocol

Before considering any phase or task complete, you MUST follow this protocol:

1. **Run verification and show actual output** — `cd app && npm run build` (show exit code); start the server; follow TESTING.md steps and show what you saw.
2. **Check phase objectives line by line** in `plan.md`; mark `☐ → ☑` with evidence; state anything incomplete.
3. **Update documentation** — README.md "Current Status"; TESTING.md for new features; `../spec.md` if implementation diverged (with rationale); `plan.md` task checkboxes.
4. **Proactively say: "Let's wrap up Phase X."**
5. **Walk me through testing with exact steps** — "type 'hello', click ↑, you should see tokens stream in" — not "test the feature."
6. **Wait for my confirmation** before the next phase.
7. **Memory sweep** — capture gotchas/decisions in this file or `../spec.md`.
8. **Offer a commit message.**

**CRITICAL: Never say "should work", "tests passed" (without output), or "moving to Phase X" before I confirm.**

---

## Version Control

- Propose a commit message and wait for confirmation before committing.
- Format: `type: short description` + bullet points.
- Branch: `feature/description` — never commit directly to `main`.
- Never commit: `.env`, `node_modules`, build artifacts.
- Always commit: `.env.example`, `package.json`, `plan.md` updates.

---

## Continuous Documentation

As you work, update docs immediately — not just at wrap-up:
- **AGENTS.md** — gotchas, patterns, decisions discovered this session
- **`../spec.md`** — when implementation differs from the design (use the "Implementation Decisions" section)
- **README.md** — when status or capabilities change

Ask at every pause: *"What would confuse the next agent about what I just did?"* If the answer is anything, write it down.
