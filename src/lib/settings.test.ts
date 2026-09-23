import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveApiKey } from './settings'

describe('resolveApiKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers a user-supplied key over the build-time fallback', () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'fallback-key')
    expect(resolveApiKey({ apiKey: 'user-key' })).toBe('user-key')
  })

  it('falls back to VITE_ANTHROPIC_API_KEY when no user key is set', () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'fallback-key')
    expect(resolveApiKey({ apiKey: '' })).toBe('fallback-key')
  })

  it('treats a whitespace-only user key as unset', () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'fallback-key')
    expect(resolveApiKey({ apiKey: '   ' })).toBe('fallback-key')
  })

  it('returns undefined when neither a user key nor a fallback exists', () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '')
    expect(resolveApiKey({ apiKey: '' })).toBeFalsy()
  })
})
