// Benchmarks Distill's real AI summarisation pipeline (O4 in the project
// proposal) against the 20-document corpus in benchmark/corpus/, recording
// end-to-end latency, input/output token consumption, and ROUGE-1/2/L
// against each document's reference summary.
//
// SAFETY: this script does NOT call the real Claude API unless invoked with
// --live *and* a real ANTHROPIC_API_KEY is set. Without --live it validates
// the corpus and reports what it would do, at zero cost. This is deliberate:
// real runs cost real money, and the corpus/harness were built before an API
// key was configured, on the explicit understanding that live runs happen
// last, only when asked for directly.
//
// Usage:
//   npx tsx benchmark/run-benchmark.ts            # dry run, no API calls, no cost
//   npx tsx benchmark/run-benchmark.ts --live      # calls the real API for any
//                                                   # document not already cached

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { ANALYSE_MODEL, ANALYSE_SYSTEM_PROMPT, extractJsonText } from '../src/lib/ai-shared'
import { scoreSummary, type RougeScores } from './rouge'

const BENCHMARK_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const CORPUS_DIR = path.join(BENCHMARK_DIR, 'corpus')
const CACHE_DIR = path.join(BENCHMARK_DIR, 'cache')
const RESULTS_DIR = path.join(BENCHMARK_DIR, 'results')

interface ManifestEntry {
  id: string
  domain: 'computer-science' | 'humanities' | 'natural-sciences'
  lengthBand: 500 | 2000 | 5000
  title: string
  sourceUrl: string
  license: string
  wordCount: number
  textFile: string
  referenceSummary: string
}

interface DocumentAnalysis {
  summary: string
  cards: Array<{ front: string; back: string; type: string }>
  topic: string
  keywords: string[]
}

interface CachedResult {
  documentId: string
  requestedAt: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  analysis: DocumentAnalysis
}

interface ResultRow {
  id: string
  domain: string
  lengthBand: number
  wordCount: number
  status: 'scored' | 'not run (dry run, not cached)'
  latencyMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  rouge1F: number | null
  rouge2F: number | null
  rougeLF: number | null
}

async function loadManifest(): Promise<ManifestEntry[]> {
  const raw = await readFile(path.join(CORPUS_DIR, 'manifest.json'), 'utf-8')
  return JSON.parse(raw) as ManifestEntry[]
}

async function loadCachedResult(id: string): Promise<CachedResult | null> {
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${id}.json`), 'utf-8')
    return JSON.parse(raw) as CachedResult
  } catch {
    return null
  }
}

async function callClaude(client: Anthropic, text: string): Promise<CachedResult> {
  const start = Date.now()
  const message = await client.messages.create({
    model: ANALYSE_MODEL,
    max_tokens: 4096,
    system: ANALYSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })
  const latencyMs = Date.now() - start

  // Not content[0]: adaptive thinking runs by default on Sonnet 5 whenever `thinking`
  // is omitted, so a `thinking` block can precede the `text` block in the response
  // (same fix as src/lib/ai-adapter.ts's parseJsonResponse — this script has its own
  // copy of the parsing logic rather than importing that one, so it needed it too).
  const block = message.content.find(b => b.type === 'text')
  if (!block) {
    throw new Error('Expected a text response from the Claude API')
  }
  const analysis = JSON.parse(extractJsonText(block.text)) as DocumentAnalysis

  return {
    documentId: '', // filled in by the caller
    requestedAt: new Date().toISOString(),
    latencyMs,
    inputTokens: message.usage.input_tokens ?? 0,
    outputTokens: message.usage.output_tokens,
    analysis,
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return NaN
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function printSummaryTable(rows: ResultRow[]) {
  const scored = rows.filter(r => r.status === 'scored')
  console.log(`\n${scored.length}/${rows.length} documents scored.\n`)

  if (scored.length === 0) return

  console.log('Overall means:')
  console.log(`  latency:  ${mean(scored.map(r => r.latencyMs!)).toFixed(0)} ms`)
  console.log(`  input tokens:  ${mean(scored.map(r => r.inputTokens!)).toFixed(0)}`)
  console.log(`  output tokens: ${mean(scored.map(r => r.outputTokens!)).toFixed(0)}`)
  console.log(`  ROUGE-1 F1: ${mean(scored.map(r => r.rouge1F!)).toFixed(4)}`)
  console.log(`  ROUGE-2 F1: ${mean(scored.map(r => r.rouge2F!)).toFixed(4)}`)
  console.log(`  ROUGE-L F1: ${mean(scored.map(r => r.rougeLF!)).toFixed(4)}`)

  console.log('\nBy length band:')
  for (const band of [500, 2000, 5000]) {
    const bandRows = scored.filter(r => r.lengthBand === band)
    if (bandRows.length === 0) continue
    console.log(
      `  ${band}w (n=${bandRows.length}): latency ${mean(bandRows.map(r => r.latencyMs!)).toFixed(0)} ms, ` +
        `ROUGE-L F1 ${mean(bandRows.map(r => r.rougeLF!)).toFixed(4)}`
    )
  }

  console.log('\nBy domain:')
  for (const domain of ['computer-science', 'humanities', 'natural-sciences']) {
    const domainRows = scored.filter(r => r.domain === domain)
    if (domainRows.length === 0) continue
    console.log(
      `  ${domain} (n=${domainRows.length}): latency ${mean(domainRows.map(r => r.latencyMs!)).toFixed(0)} ms, ` +
        `ROUGE-L F1 ${mean(domainRows.map(r => r.rougeLF!)).toFixed(4)}`
    )
  }
}

function toCsv(rows: ResultRow[]): string {
  const header = [
    'id', 'domain', 'lengthBand', 'wordCount', 'status',
    'latencyMs', 'inputTokens', 'outputTokens', 'rouge1F', 'rouge2F', 'rougeLF',
  ]
  const lines = rows.map(r =>
    [r.id, r.domain, r.lengthBand, r.wordCount, r.status, r.latencyMs, r.inputTokens, r.outputTokens, r.rouge1F, r.rouge2F, r.rougeLF]
      .map(v => (v === null ? '' : String(v)))
      .join(',')
  )
  return [header.join(','), ...lines].join('\n')
}

async function main() {
  const live = process.argv.includes('--live')

  let manifest: ManifestEntry[]
  try {
    manifest = await loadManifest()
  } catch {
    console.error(
      `Could not read ${path.join(CORPUS_DIR, 'manifest.json')}. Has the corpus been assembled yet? ` +
        'See benchmark/corpus/ — it should contain manifest.json plus one .txt file per document.'
    )
    process.exitCode = 1
    return
  }

  await mkdir(CACHE_DIR, { recursive: true })
  await mkdir(RESULTS_DIR, { recursive: true })

  let client: Anthropic | null = null
  if (live) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(
        'Refusing to run --live: no ANTHROPIC_API_KEY environment variable is set.\n' +
          'This is deliberate — this benchmark spends real money per the project proposal\'s own risk register. ' +
          'Set ANTHROPIC_API_KEY before running --live.'
      )
      process.exitCode = 1
      return
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    console.log(`Running LIVE against the real Claude API (model: ${ANALYSE_MODEL}). This will incur real cost for any uncached document.\n`)
  } else {
    console.log('Dry run (no --live flag): only scoring documents that already have a cached API response. No API calls will be made.\n')
  }

  const rows: ResultRow[] = []

  for (const entry of manifest) {
    let cached = await loadCachedResult(entry.id)

    if (!cached && live && client) {
      const documentPath = path.join(CORPUS_DIR, entry.textFile)
      const text = await readFile(documentPath, 'utf-8')
      console.log(`  calling Claude for ${entry.id} (${entry.domain}, ~${entry.wordCount}w)...`)
      const result = await callClaude(client, text)
      result.documentId = entry.id
      cached = result
      await writeFile(path.join(CACHE_DIR, `${entry.id}.json`), JSON.stringify(result, null, 2), 'utf-8')
    }

    if (!cached) {
      rows.push({
        id: entry.id,
        domain: entry.domain,
        lengthBand: entry.lengthBand,
        wordCount: entry.wordCount,
        status: 'not run (dry run, not cached)',
        latencyMs: null,
        inputTokens: null,
        outputTokens: null,
        rouge1F: null,
        rouge2F: null,
        rougeLF: null,
      })
      continue
    }

    const rouge: RougeScores = scoreSummary(cached.analysis.summary, entry.referenceSummary)
    rows.push({
      id: entry.id,
      domain: entry.domain,
      lengthBand: entry.lengthBand,
      wordCount: entry.wordCount,
      status: 'scored',
      latencyMs: cached.latencyMs,
      inputTokens: cached.inputTokens,
      outputTokens: cached.outputTokens,
      rouge1F: rouge.rouge1.fmeasure,
      rouge2F: rouge.rouge2.fmeasure,
      rougeLF: rouge.rougeL.fmeasure,
    })
  }

  await writeFile(path.join(RESULTS_DIR, 'results.json'), JSON.stringify(rows, null, 2), 'utf-8')
  await writeFile(path.join(RESULTS_DIR, 'results.csv'), toCsv(rows), 'utf-8')

  printSummaryTable(rows)
  console.log(`\nFull results written to ${path.join(RESULTS_DIR, 'results.json')} and results.csv`)
}

// Guards against corpus/cache directories that don't exist yet being silently
// treated as "zero documents" — surfaces the real problem instead.
readdir(CORPUS_DIR)
  .catch(() => {
    console.error(`Corpus directory not found: ${CORPUS_DIR}`)
    process.exit(1)
  })
  .then(() => main())
