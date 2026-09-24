import type Anthropic from '@anthropic-ai/sdk'
import type { AIDocumentAnalysis, AIProvider, AIRelationship } from '../types'
import {
  ANALYSE_MODEL,
  ANALYSE_SYSTEM_PROMPT,
  extractJsonText,
  RELATIONSHIPS_MODEL,
  RELATIONSHIPS_SYSTEM_PROMPT,
} from './ai-shared'
import { loadSettings, resolveApiKey } from './settings'

// The only place in the app that talks to Claude: one call analyses a note's text (summary/cards/topic/keywords), the other compares it against existing notes to find Knowledge Map connections.

// Thrown when there's no API key at all — distinct from a request actually
// failing, so callers could special-case "go set this up" vs "try again."
export class AIConfigError extends Error {}

// Turns the raw Anthropic SDK/network error into a short, plain-language
// message — the SDK's own error text is written for developers (e.g.
// "Could not resolve authentication method. Expected one of apiKey,
// authToken, credentials, config, or profile to be set...") and was found
// showing up verbatim in the note UI during the O5 heuristic evaluation
// (see the dissertation, Appendix A, finding AI-1).
function friendlyApiErrorMessage(err: unknown): string {
  const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined

  if (status === 402) {
    return "The live demo has used up this month's AI allowance, so new summaries and flashcards are paused until next month. Your notes and study sessions still work, or you can add your own Claude API key in Settings."
  }
  if (status === 401) return "That API key wasn't accepted. Check it in Settings and try again."
  if (status === 429) return 'Claude is rate-limiting requests right now. Wait a moment and try again.'
  if (status && status >= 500) return "Claude's API is having trouble right now. Try again in a moment."
  if (err instanceof Error && /fetch|network/i.test(err.message)) {
    return "Couldn't reach Claude's API. Check your internet connection and try again."
  }
  return "Something went wrong talking to Claude's API. Try again in a moment."
}

interface ExistingDocSummary {
  id: number
  title: string
  summary: string
  keywords: string[]
}

interface NewDocSummary {
  title: string
  summary: string
  keywords: string[]
}

function cacheKey(scope: string, input: string): string {
  return `distill:ai:${scope}:${btoa(encodeURIComponent(input.slice(0, 200)))}`
}

function parseJsonResponse<T>(message: Anthropic.Message): T {
  // Not content[0]: adaptive thinking runs by default on Sonnet 5 whenever `thinking`
  // is omitted, so a `thinking` block can precede the `text` block in the response.
  const block = message.content.find(b => b.type === 'text')
  if (!block) {
    throw new Error('Expected a text response from the Claude API')
  }
  return JSON.parse(extractJsonText(block.text)) as T
}

class AnthropicAdapter implements AIProvider {
  // The Anthropic SDK module is only pulled into a loaded chunk once a
  // document is actually analysed (not sitting in the main bundle for every
  // visit) — but the client itself is rebuilt on every call, cheaply, so a
  // key entered in Settings takes effect immediately without needing a
  // page reload or manual cache invalidation.
  private sdkPromise: Promise<typeof Anthropic> | null = null

  private async getClient(): Promise<Anthropic> {
    const apiKey = resolveApiKey(loadSettings())
    // The hosted demo has no key in the bundle. It sends requests to its own
    // /api/anthropic relay (api/anthropic.ts), which adds the key server-side.
    const useRelay = !apiKey && import.meta.env.VITE_USE_AI_RELAY === 'true'
    if (!apiKey && !useRelay) {
      throw new AIConfigError('AI features need a Claude API key. Add one in Settings to use this.')
    }

    if (!this.sdkPromise) {
      this.sdkPromise = import('@anthropic-ai/sdk').then(mod => mod.default)
    }
    const AnthropicClient = await this.sdkPromise
    if (useRelay) {
      return new AnthropicClient({
        apiKey: 'relay',
        baseURL: `${window.location.origin}/api/anthropic`,
        dangerouslyAllowBrowser: true,
      })
    }
    return new AnthropicClient({ apiKey, dangerouslyAllowBrowser: true })
  }

  async analyseDocument(text: string, signal?: AbortSignal): Promise<AIDocumentAnalysis> {
    const key = cacheKey('analyse', text)
    const cached = localStorage.getItem(key)
    if (cached) return JSON.parse(cached) as AIDocumentAnalysis

    const client = await this.getClient()
    let message: Anthropic.Message
    try {
      message = await client.messages.create(
        {
          model: ANALYSE_MODEL,
          max_tokens: 4096,
          system: ANALYSE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: text }],
        },
        { signal }
      )
    } catch (err) {
      // A user-triggered cancellation, not a failure. The SDK wraps an aborted request in its
      // own APIUserAbortError (whose .name is just "Error", not "AbortError"), so the signal
      // itself — not the error's type or name — is the reliable way to detect this.
      if (signal?.aborted) throw err
      throw new Error(friendlyApiErrorMessage(err))
    }

    const analysis = parseJsonResponse<AIDocumentAnalysis>(message)
    localStorage.setItem(key, JSON.stringify(analysis))
    return analysis
  }

  async detectRelationships(
    newDoc: NewDocSummary,
    existingDocs: ExistingDocSummary[],
    signal?: AbortSignal
  ): Promise<AIRelationship[]> {
    if (existingDocs.length === 0) return [] // nothing to connect to yet

    // Only compare against the 20 most recent notes, to keep the prompt (and cost) from growing forever.
    const candidates = existingDocs.slice(-20)
    const userMessage = JSON.stringify({ newDocument: newDoc, existingDocuments: candidates })

    const key = cacheKey('relationships', userMessage)
    const cached = localStorage.getItem(key)
    if (cached) return JSON.parse(cached) as AIRelationship[]

    const client = await this.getClient()
    let message: Anthropic.Message
    try {
      message = await client.messages.create(
        {
          model: RELATIONSHIPS_MODEL,
          max_tokens: 2048,
          system: RELATIONSHIPS_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        },
        { signal }
      )
    } catch (err) {
      if (signal?.aborted) throw err
      throw new Error(friendlyApiErrorMessage(err))
    }

    const relationships = parseJsonResponse<AIRelationship[]>(message)
    localStorage.setItem(key, JSON.stringify(relationships))
    return relationships
  }
}

export const ai = new AnthropicAdapter()
