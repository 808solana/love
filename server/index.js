import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import dotenv from 'dotenv'

// The API key lives in the repo-root .env (one level up from server/).
// It is read here, server-side only, and never sent to the browser.
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') })

const API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = 'openrouter/owl-alpha'
const PORT = 3001

const log = (msg) => {
  const t = new Date().toTimeString().slice(0, 8)
  const line = `[${t}] [SERVER] ${msg}`
  console.log(line)
  // Synchronous append so logs are on disk immediately (stdout to a file buffers).
  try {
    fs.appendFileSync(path.resolve(import.meta.dirname, 'server.debug.log'), line + '\n')
  } catch {
    /* ignore */
  }
}

if (!API_KEY) {
  log('WARNING: OPENROUTER_API_KEY is not set in ../.env — requests will fail.')
}

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL })
})

app.post('/api/chat', async (req, res) => {
  const query = (req.body?.query ?? '').toString().trim()
  if (!query) {
    return res.status(400).json({ error: 'Please type a question first.' })
  }

  // Abort the upstream call only if the client disconnects before we finish.
  // (Listening on req 'close' can fire as soon as the body is read, which would
  // abort the fetch prematurely — so we key off the response instead.)
  const controller = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  let upstream
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'AI Answer Engine',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful answer engine. Give clear, accurate, well-structured answers.',
          },
          { role: 'user', content: query },
        ],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') return // client went away; nothing to send
    log(`Upstream request failed: ${err.name}: ${err.message}${err.cause ? ` (cause: ${err.cause})` : ''}`)
    return res
      .status(502)
      .json({ error: 'Could not reach the answer service. Please try again.' })
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    log(`Upstream error ${upstream.status}: ${detail.slice(0, 200)}`)
    return res
      .status(upstream.status || 502)
      .json({ error: `The answer service returned an error (${upstream.status}).` })
  }

  // Forward OpenRouter's Server-Sent Events stream straight through to the client.
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  log(`Streaming answer for: "${query.slice(0, 60)}"`)

  const reader = upstream.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } catch (err) {
    if (err.name !== 'AbortError') log(`Stream error: ${err.message}`)
  } finally {
    res.end()
  }
})

// Return JSON (not Express's default HTML page) for malformed requests.
app.use((err, _req, res, _next) => {
  log(`Request error: ${err.message}`)
  if (res.headersSent) return
  res.status(400).json({ error: 'Invalid request.' })
})

app.listen(PORT, () => log(`running on ${PORT}`))
