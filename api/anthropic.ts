// Server-side relay for the hosted demo. The browser talks to /api/anthropic
// instead of api.anthropic.com, so the real API key only ever lives in this
// function's environment and never ships in the JavaScript bundle.
//
// It only forwards the two kinds of request Distill actually makes, caps how
// much each one can cost, and slows down anyone sending far more than a person
// studying would.

const ALLOWED_MODELS = new Set(['claude-sonnet-5', 'claude-haiku-4-5'])
const MAX_OUTPUT_TOKENS = 4096
const MAX_BODY_BYTES = 400_000 // roughly a long PDF's worth of extracted text

// Per-instance, best-effort limit. Serverless instances come and go, so this
// is a speed bump for scripts rather than a hard quota; the spend limit on the
// Anthropic account is the real ceiling.
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 30
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_REQUESTS_PER_WINDOW
}

function error(status: number, message: string): Response {
  return Response.json({ type: 'error', error: { type: 'proxy_error', message } }, { status })
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return error(500, 'The demo is missing its API key.')

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) return error(429, 'Too many requests. Try again in a few minutes.')

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return error(413, 'That note is too long for the demo.')

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return error(400, 'Invalid request.')
  }

  if (typeof body.model !== 'string' || !ALLOWED_MODELS.has(body.model)) return error(400, 'Model not allowed.')
  if (body.stream) return error(400, 'Streaming is not supported.')
  body.max_tokens = Math.min(Number(body.max_tokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS)

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': request.headers.get('anthropic-version') ?? '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
