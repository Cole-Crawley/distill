import { describe, expect, it } from 'vitest'
import { scoreSummary } from './rouge'

describe('scoreSummary', () => {
  it('scores a near-identical sentence pair against hand-computed ROUGE values', () => {
    // candidate: "the cat sat on the mat" vs reference: "the cat is on the mat"
    // Hand-computed (see comments in rouge.ts for the formulas):
    //   ROUGE-1 overlap = 5 of 6 tokens both ways -> P = R = F = 5/6
    //   ROUGE-2 overlap = 3 of 5 bigrams both ways -> P = R = F = 3/5
    //   ROUGE-L LCS = 5 ("the cat on the mat") of 6 tokens both ways -> P = R = F = 5/6
    const result = scoreSummary('the cat sat on the mat', 'the cat is on the mat')

    expect(result.rouge1.precision).toBeCloseTo(5 / 6, 10)
    expect(result.rouge1.recall).toBeCloseTo(5 / 6, 10)
    expect(result.rouge1.fmeasure).toBeCloseTo(5 / 6, 10)

    expect(result.rouge2.precision).toBeCloseTo(3 / 5, 10)
    expect(result.rouge2.recall).toBeCloseTo(3 / 5, 10)
    expect(result.rouge2.fmeasure).toBeCloseTo(3 / 5, 10)

    expect(result.rougeL.precision).toBeCloseTo(5 / 6, 10)
    expect(result.rougeL.recall).toBeCloseTo(5 / 6, 10)
    expect(result.rougeL.fmeasure).toBeCloseTo(5 / 6, 10)
  })

  it('scores a perfect match as 1.0 across all three metrics', () => {
    const result = scoreSummary('spaced repetition improves retention', 'spaced repetition improves retention')
    expect(result.rouge1.fmeasure).toBe(1)
    expect(result.rouge2.fmeasure).toBe(1)
    expect(result.rougeL.fmeasure).toBe(1)
  })

  it('scores completely disjoint text as 0 across all three metrics', () => {
    const result = scoreSummary('completely unrelated words here', 'totally different content entirely')
    expect(result.rouge1.fmeasure).toBe(0)
    expect(result.rouge2.fmeasure).toBe(0)
    expect(result.rougeL.fmeasure).toBe(0)
  })

  it('clips repeated n-grams instead of letting repetition inflate the score', () => {
    // candidate repeats "the" far more than the reference has it — clipped
    // counting must cap the contribution of "the" at the reference's count.
    const result = scoreSummary('the the the the the', 'the cat sat down')
    // overlap for "the" = min(5, 1) = 1; candidate has 5 unigrams -> precision = 1/5
    expect(result.rouge1.precision).toBeCloseTo(1 / 5, 10)
    // reference has 4 unigrams -> recall = 1/4
    expect(result.rouge1.recall).toBeCloseTo(1 / 4, 10)
  })

  it('is case-insensitive and ignores punctuation', () => {
    const result = scoreSummary('The Cat, sat on the mat!', 'the cat sat on the mat')
    expect(result.rouge1.fmeasure).toBe(1)
  })

  it('returns all-zero scores when either input has no tokens', () => {
    const result = scoreSummary('', 'the cat sat on the mat')
    expect(result.rouge1).toEqual({ precision: 0, recall: 0, fmeasure: 0 })
    expect(result.rouge2).toEqual({ precision: 0, recall: 0, fmeasure: 0 })
    expect(result.rougeL).toEqual({ precision: 0, recall: 0, fmeasure: 0 })
  })
})
