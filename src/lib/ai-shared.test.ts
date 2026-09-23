import { describe, expect, it } from 'vitest'
import { extractJsonText } from './ai-shared'

describe('extractJsonText', () => {
  it('returns plain JSON text unchanged', () => {
    expect(extractJsonText('{"a":1}')).toBe('{"a":1}')
  })

  it('strips a ```json fenced block', () => {
    expect(extractJsonText('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('strips a plain ``` fenced block with no language tag', () => {
    expect(extractJsonText('```\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('trims surrounding whitespace', () => {
    expect(extractJsonText('  \n{"a":1}\n  ')).toBe('{"a":1}')
  })
})
