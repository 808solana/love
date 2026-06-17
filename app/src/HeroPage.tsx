import { useRef, useState } from 'react'

type Phase = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

/** Shape of a single OpenRouter SSE chunk (only the fields we read). */
type StreamChunk = {
  choices?: { delta?: { content?: string } }[]
  error?: { message?: string }
}

const log = (msg: string) => {
  const t = new Date().toTimeString().slice(0, 8)
  console.log(`[${t}] [CLIENT] ${msg}`)
}

export default function HeroPage() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const busy = phase === 'loading' || phase === 'streaming'
  const hasContent = phase !== 'idle'

  // Grow the textarea with its content, up to the CSS max-height.
  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }

  async function submit() {
    const q = query.trim()
    if (!q || busy) return

    setAnswer('')
    setError('')
    setPhase('loading')
    log(`submitting: "${q.slice(0, 60)}"`)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      // Errors arrive as plain JSON (the stream never started).
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status}).`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // A chunk may hold several SSE lines, or end mid-line — split and
        // keep the trailing partial in the buffer for the next read.
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const raw of lines) {
          const line = raw.trim()
          if (!line || line.startsWith(':')) continue // blank or keep-alive comment
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue

          let parsed: StreamChunk
          try {
            parsed = JSON.parse(payload) as StreamChunk
          } catch {
            continue // ignore unparseable fragments
          }
          if (parsed.error) {
            throw new Error(parsed.error.message || 'The answer service reported an error.')
          }
          const token = parsed.choices?.[0]?.delta?.content
          if (token) {
            setAnswer((prev) => prev + token)
            setPhase('streaming')
          }
        }
      }

      setPhase('done')
      log('stream complete')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      log(`error: ${message}`)
      setError(message)
      setPhase('error')
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <main className={`page${hasContent ? ' has-content' : ''}`}>
      <div className="shell">
        <span className="eyebrow">
          <span className="dot" />
          Answer Engine
        </span>

        <h1 className="headline">
          What would you like to <em>know</em>?
        </h1>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              autoGrow()
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask anything…"
            rows={1}
            aria-label="Your question"
            autoFocus
          />
          <button
            className="send"
            type="submit"
            disabled={busy || !query.trim()}
            aria-label="Send question"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 19V5M12 5l-6 6M12 5l6 6"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        {hasContent && (
          <section className="answer" aria-live="polite" aria-busy={busy}>
            <div className="answer-label">Answer</div>
            {phase === 'loading' ? (
              <div className="thinking" aria-label="Thinking">
                <span />
                <span />
                <span />
              </div>
            ) : error ? (
              <p className="answer-body is-error">{error}</p>
            ) : (
              <p className="answer-body">
                {answer || (phase === 'done' ? 'No answer was returned. Please try again.' : '')}
                {phase === 'streaming' && <span className="caret" aria-hidden="true" />}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
