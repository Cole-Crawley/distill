// A live, end-to-end smoke test against the REAL Claude API — no mocks.
// Costs real money per run, so it never fires on a plain `npm test`. It only
// runs when BOTH an API key resolves AND the caller explicitly opts in via
// RUN_LIVE_API_TESTS=1, mirroring benchmark/run-benchmark.ts's own --live
// gate (see that file's header comment for the same reasoning).
//
// Run it with:
//   RUN_LIVE_API_TESTS=1 npx vitest run src/lib/ai-adapter.live.test.ts
import { describe, expect, it, vi } from 'vitest'
import { ai } from './ai-adapter'
import { loadSettings, resolveApiKey } from './settings'
import type { TopicCategory } from '../types'

const TOPIC_CATEGORIES: TopicCategory[] = [
  'machine-learning',
  'science',
  'history',
  'technology',
  'business',
  'health',
  'other',
]

const hasApiKey = Boolean(resolveApiKey(loadSettings()))
const optedIn = process.env.RUN_LIVE_API_TESTS === '1'

function makeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  }
}
vi.stubGlobal('localStorage', makeLocalStorage())

describe.skipIf(!hasApiKey || !optedIn)('AnthropicAdapter — live API', () => {
  it(
    'analyseDocument gets a real, correctly-shaped response back from Claude',
    async () => {
      const text =
        'Photosynthesis is the process by which plants convert light energy into chemical ' +
        'energy stored in glucose. It occurs in the chloroplasts and requires sunlight, ' +
        'water, and carbon dioxide, producing oxygen as a byproduct.'

      const analysis = await ai.analyseDocument(text)

      expect(typeof analysis.summary).toBe('string')
      expect(analysis.summary.length).toBeGreaterThan(0)
      expect(Array.isArray(analysis.cards)).toBe(true)
      expect(analysis.cards.length).toBeGreaterThan(0)
      for (const card of analysis.cards) {
        expect(typeof card.front).toBe('string')
        expect(typeof card.back).toBe('string')
        expect(['qa', 'cloze', 'definition']).toContain(card.type)
      }
      expect(TOPIC_CATEGORIES).toContain(analysis.topic)
      expect(Array.isArray(analysis.keywords)).toBe(true)
      expect(analysis.keywords.length).toBeGreaterThan(0)
    },
    30_000
  )

  it(
    'detectRelationships gets a real, correctly-shaped response back from Claude',
    async () => {
      const relationships = await ai.detectRelationships(
        { title: 'Backpropagation', summary: 'How gradients are computed in neural networks.', keywords: ['gradient', 'neural network', 'chain rule'] },
        [
          {
            id: 1,
            title: 'Neural Network Fundamentals',
            summary: 'An introduction to neurons, layers, and activation functions.',
            keywords: ['neuron', 'layer', 'activation function', 'neural network'],
          },
          {
            id: 2,
            title: 'The Roman Republic',
            summary: 'The political structure of Rome before the empire.',
            keywords: ['senate', 'consul', 'rome'],
          },
        ]
      )

      expect(Array.isArray(relationships)).toBe(true)
      for (const rel of relationships) {
        expect(typeof rel.targetDocumentId).toBe('number')
        expect(['related', 'prerequisite', 'contradicts', 'extends']).toContain(rel.relationshipType)
        expect(rel.strength).toBeGreaterThanOrEqual(0)
        expect(rel.strength).toBeLessThanOrEqual(1)
        expect(typeof rel.reason).toBe('string')
      }
    },
    30_000
  )
})
