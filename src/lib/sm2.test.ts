import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { calculateNextReview } from './sm2'
import type { CardState } from '../types'

const FIXED_NOW = new Date('2026-06-15T12:00:00.000Z')

function freshCard(overrides: Partial<CardState> = {}): CardState {
  return {
    interval: 0,
    repetition: 0,
    easeFactor: 2.5,
    due: new Date(),
    ...overrides,
  }
}

function daysAfter(days: number): Date {
  const d = new Date(FIXED_NOW)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d
}

describe('calculateNextReview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules a brand-new card one day out on its first correct answer', () => {
    const result = calculateNextReview(freshCard({ repetition: 0 }), 4)
    expect(result.interval).toBe(1)
    expect(result.repetition).toBe(1)
    expect(result.due).toEqual(daysAfter(1))
  })

  it('jumps to the fixed 6-day interval on the second correct answer in a row', () => {
    const result = calculateNextReview(freshCard({ repetition: 1, interval: 1 }), 4)
    expect(result.interval).toBe(6)
    expect(result.repetition).toBe(2)
    expect(result.due).toEqual(daysAfter(6))
  })

  it('grows the interval by the ease factor from the third correct answer onward', () => {
    const result = calculateNextReview(freshCard({ repetition: 2, interval: 6, easeFactor: 2.5 }), 4)
    expect(result.interval).toBe(Math.round(6 * 2.5)) // 15
    expect(result.repetition).toBe(3)
  })

  it('resets repetition and forces a next-day review on a failing grade', () => {
    const result = calculateNextReview(freshCard({ repetition: 5, interval: 30, easeFactor: 2.8 }), 2)
    expect(result.interval).toBe(1)
    expect(result.repetition).toBe(0)
    expect(result.due).toEqual(daysAfter(1))
  })

  it('leaves the ease factor untouched on a failing grade', () => {
    const result = calculateNextReview(freshCard({ repetition: 5, interval: 30, easeFactor: 2.8 }), 1)
    expect(result.easeFactor).toBe(2.8)
  })

  it.each([
    [5, 0.1],
    [4, 0.0],
    [3, -0.14],
  ])('adjusts ease factor by the standard SM-2 delta for quality %i', (quality, delta) => {
    const result = calculateNextReview(freshCard({ repetition: 2, interval: 6, easeFactor: 2.5 }), quality)
    expect(result.easeFactor).toBeCloseTo(2.5 + delta, 10)
  })

  it('never lets the ease factor drop below the 1.3 floor', () => {
    const result = calculateNextReview(freshCard({ repetition: 2, interval: 6, easeFactor: 1.32 }), 3)
    expect(result.easeFactor).toBe(1.3)
  })

  it('rejects a quality outside the 0-5 range', () => {
    expect(() => calculateNextReview(freshCard(), 6)).toThrow()
    expect(() => calculateNextReview(freshCard(), -1)).toThrow()
  })

  it('rejects a non-integer quality', () => {
    expect(() => calculateNextReview(freshCard(), 3.5)).toThrow()
  })

  it('always sets the due date to midnight', () => {
    const result = calculateNextReview(freshCard({ repetition: 1, interval: 1 }), 5)
    expect(result.due.getHours()).toBe(0)
    expect(result.due.getMinutes()).toBe(0)
    expect(result.due.getSeconds()).toBe(0)
  })
})
