import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks must be hoisted above the imports below so vi.mock's factory can
// reference them (vi.mock itself is hoisted above all imports by Vitest).
const mockCreate = vi.hoisted(() => vi.fn())
const mockResolveApiKey = vi.hoisted(() => vi.fn((): string | undefined => 'test-api-key'))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function MockAnthropic() {
    return { messages: { create: mockCreate } }
  }),
}))

vi.mock('./settings', () => ({
  loadSettings: vi.fn(() => ({ apiKey: 'test-api-key' })),
  resolveApiKey: mockResolveApiKey,
}))

const { ai, AIConfigError } = await import('./ai-adapter')
const { ANALYSE_MODEL, RELATIONSHIPS_MODEL } = await import('./ai-shared')

// ai-adapter.ts is written for the browser (localStorage-backed response
// cache) but these tests run under vitest's 'node' environment, which has
// no localStorage global — stub a minimal in-memory version.
function makeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  }
}

function textResponse(text: string) {
  return { content: [{ type: 'text', text }] }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage())
  mockCreate.mockReset()
  mockResolveApiKey.mockReturnValue('test-api-key')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AnthropicAdapter.analyseDocument', () => {
  it('uses the analyse model (Sonnet — the more demanding, generative task)', async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse(JSON.stringify({ summary: 's', cards: [], topic: 'other', keywords: [] }))
    )
    await ai.analyseDocument('unique doc text: model check')
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: ANALYSE_MODEL }), expect.anything())
  })

  it('caches the result and does not call the API twice for the same text', async () => {
    mockCreate.mockResolvedValueOnce(
      textResponse(JSON.stringify({ summary: 's', cards: [], topic: 'other', keywords: [] }))
    )
    const text = 'unique doc text: cache check'
    const first = await ai.analyseDocument(text)
    const second = await ai.analyseDocument(text)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('throws AIConfigError (not a raw SDK error) when no API key resolves', async () => {
    mockResolveApiKey.mockReturnValueOnce(undefined)
    await expect(ai.analyseDocument('unique doc text: no key')).rejects.toBeInstanceOf(AIConfigError)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it.each([
    [401, "That API key wasn't accepted. Check it in Settings and try again."],
    [429, 'Claude is rate-limiting requests right now. Wait a moment and try again.'],
    [500, "Claude's API is having trouble right now. Try again in a moment."],
  ])('maps a %i API error to a plain-language message, not the raw SDK text', async (status, expected) => {
    mockCreate.mockRejectedValueOnce({ status })
    await expect(ai.analyseDocument(`unique doc text: status ${status}`)).rejects.toThrow(expected)
  })

  it('maps a network failure to a plain-language message', async () => {
    mockCreate.mockRejectedValueOnce(new TypeError('fetch failed'))
    await expect(ai.analyseDocument('unique doc text: network failure')).rejects.toThrow(
      "Couldn't reach Claude's API. Check your internet connection and try again."
    )
  })
})

describe('AnthropicAdapter.detectRelationships', () => {
  const newDoc = { title: 'New note', summary: 'a summary', keywords: ['keyword'] }

  it('returns [] without calling the API when there are no existing documents', async () => {
    const result = await ai.detectRelationships(newDoc, [])
    expect(result).toEqual([])
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('uses the relationships model (Haiku — the simpler, bounded comparison task)', async () => {
    mockCreate.mockResolvedValueOnce(textResponse('[]'))
    await ai.detectRelationships(newDoc, [{ id: 1, title: 'Existing', summary: 's', keywords: [] }])
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: RELATIONSHIPS_MODEL }), expect.anything())
  })

  it('only compares against the 20 most recently added existing documents', async () => {
    mockCreate.mockResolvedValueOnce(textResponse('[]'))
    const existingDocs = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      title: `Doc ${i}`,
      summary: 's',
      keywords: [],
    }))
    await ai.detectRelationships(newDoc, existingDocs)

    const [call] = mockCreate.mock.calls[0]
    const sentPayload = JSON.parse((call as { messages: [{ content: string }] }).messages[0].content)
    expect(sentPayload.existingDocuments).toHaveLength(20)
    expect(sentPayload.existingDocuments[0].id).toBe(5) // last 20 of ids 0..24 starts at 5
  })
})
