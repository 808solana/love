# Manual QA

Prerequisite: both servers running (see `README.md`) and `OPENROUTER_API_KEY` set in `.env`.

## Smoke test — backend only

With the Express server running on 3001:

```bash
curl.exe -N -s -X POST http://localhost:3001/api/chat -H "Content-Type: application/json" --data "{\"query\":\"Say hello in three words.\"}"
```

Expected: a stream of `: OPENROUTER PROCESSING` keep-alive lines and `data: {...}` chunks whose `choices[0].delta.content` spell out a short reply, ending with `data: [DONE]`.
(On PowerShell, passing inline JSON can mangle quotes — use a body file with `--data "@body.json"` if you see a JSON parse error.)

Health check: `curl.exe http://localhost:3001/api/health` → `{"ok":true,"model":"openrouter/owl-alpha"}`.

## Happy path — full UI

1. Open `http://localhost:3000`.
2. Confirm the page: warm paper background, `● ANSWER ENGINE` eyebrow, serif headline "What would you like to *know*?" with *know* in ember italic, and a rounded input with a circular ember ↑ button.
3. The ↑ button is **disabled** (faded) while the input is empty.
4. Type `What is the capital of France?`.
5. Press **Enter** (or click ↑).
   - The composer shows an ember focus ring; the ↑ button disables; an answer sheet appears with a pulsing "thinking" indicator.
   - `owl-alpha` is slow to first token (~10–20s) — this is expected.
6. The answer streams onto the sheet in serif, with a blinking ember caret while it writes.
7. When complete, the caret disappears and the ↑ button re-enables.

Expected answer: states that the capital of France is Paris. (Markdown like `**Paris**` is shown verbatim — markdown rendering is out of scope.)

## Keyboard & input

- **Shift+Enter** inserts a newline instead of submitting; the input grows with the text (up to a max height).
- **Tab** to the input/button: a visible ember focus ring appears.
- Submitting with only whitespace does nothing (button stays disabled).

## Error path

1. Stop the Express server (close its terminal / kill the `node index.js` process).
2. In the UI, type any question and press ↑.
3. Expected: the answer sheet shows an error message in the interface voice (e.g. "Could not reach the answer service. Please try again.") in sans-serif ember text, and the ↑ button re-enables so you can retry.
4. Restart the Express server and submit again → it works.

## Reduced motion

With OS "reduce motion" enabled, the caret stays solid and the thinking/enter animations are effectively disabled (no flashing), while functionality is unchanged.
