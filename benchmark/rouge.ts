// A from-scratch ROUGE-1/2/L implementation (Lin, 2004). No single JS package
// is a de-facto standard for ROUGE the way `rouge-score` is in Python, so this
// is written directly against the original paper's formulas rather than
// pulled in as an opaque dependency — every number this benchmark reports
// should be traceable to a formula documented here, not a black box.
//
// ROUGE-N (unigram/bigram overlap): precision/recall/F1 over n-grams, using
// *clipped* counts — an n-gram that appears 3 times in the candidate but only
// once in the reference only counts once, so repeating words can't inflate
// the score.
//
// ROUGE-L: precision/recall/F1 built from the length of the Longest Common
// Subsequence between candidate and reference token sequences, rather than
// n-gram overlap — rewards preserving the reference's word order even when
// the exact phrasing differs.
//
// All three report the F1 (beta = 1) variant, which is what's almost always
// meant when a paper just says "ROUGE-1/2/L score" without qualification.

export interface RougeScore {
  precision: number
  recall: number
  fmeasure: number
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function ngrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return []
  const result: string[] = []
  for (let i = 0; i <= tokens.length - n; i += 1) {
    result.push(tokens.slice(i, i + n).join(' '))
  }
  return result
}

function countBy<T>(items: T[]): Map<T, number> {
  const counts = new Map<T, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return counts
}

function fmeasure(precision: number, recall: number): number {
  if (precision === 0 && recall === 0) return 0
  return (2 * precision * recall) / (precision + recall)
}

function rougeN(candidate: string, reference: string, n: number): RougeScore {
  const candidateGrams = ngrams(tokenize(candidate), n)
  const referenceGrams = ngrams(tokenize(reference), n)

  if (candidateGrams.length === 0 || referenceGrams.length === 0) {
    return { precision: 0, recall: 0, fmeasure: 0 }
  }

  const candidateCounts = countBy(candidateGrams)
  const referenceCounts = countBy(referenceGrams)

  let overlap = 0
  for (const [gram, count] of candidateCounts) {
    overlap += Math.min(count, referenceCounts.get(gram) ?? 0)
  }

  const precision = overlap / candidateGrams.length
  const recall = overlap / referenceGrams.length
  return { precision, recall, fmeasure: fmeasure(precision, recall) }
}

// Standard O(m*n) longest-common-subsequence length over token sequences.
function lcsLength(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

function rougeL(candidate: string, reference: string): RougeScore {
  const candidateTokens = tokenize(candidate)
  const referenceTokens = tokenize(reference)

  if (candidateTokens.length === 0 || referenceTokens.length === 0) {
    return { precision: 0, recall: 0, fmeasure: 0 }
  }

  const lcs = lcsLength(candidateTokens, referenceTokens)
  const precision = lcs / candidateTokens.length
  const recall = lcs / referenceTokens.length
  return { precision, recall, fmeasure: fmeasure(precision, recall) }
}

export interface RougeScores {
  rouge1: RougeScore
  rouge2: RougeScore
  rougeL: RougeScore
}

export function scoreSummary(candidate: string, reference: string): RougeScores {
  return {
    rouge1: rougeN(candidate, reference, 1),
    rouge2: rougeN(candidate, reference, 2),
    rougeL: rougeL(candidate, reference),
  }
}
