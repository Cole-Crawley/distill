# AI pipeline benchmark (O4) — live run results

Target (per project proposal §4.3): benchmark the AI summarisation/card-generation pipeline against a 20-document corpus stratified by domain (computer science, humanities, natural sciences) and length (500/2,000/5,000 words), recording end-to-end latency, input/output token consumption, and ROUGE-1/2/L against reference summaries. Unlike the Lighthouse audit (O4's other half), the proposal sets no numeric pass/fail bar for ROUGE — it's meant as objective, reproducible evidence of pipeline quality, not a target to clear.

**Method**: `npx tsx benchmark/run-benchmark.ts --live`, run 2026-08-11 against the real Claude API, using the exact model (`claude-sonnet-5`) and system prompt (`ANALYSE_SYSTEM_PROMPT`) the live app sends — both imported from `src/lib/ai-shared.ts`, the single source shared between the app and this script, specifically so the benchmark can't silently drift from what a real user's "Clarify with AI" click actually does. Reference summaries are each article's own lead section (a documented, deliberate substitute for a published abstract — see `benchmark/corpus/manifest.json` and project memory for the corpus-assembly rationale); the lead section is stripped from the body text before it's sent, so the model isn't summarising a document that already contains its own summary. BERTScore (the proposal's optional supplemental metric) was **not** computed in this run — ROUGE-1/2/L only.

## Results

All 20/20 corpus documents scored. Full per-document figures: `results.json` / `results.csv`.

**Overall means:**

| Metric | Value |
|---|---|
| Latency | 17,584 ms |
| Input tokens | 5,685 |
| Output tokens | 1,721 |
| ROUGE-1 F1 | 0.2794 |
| ROUGE-2 F1 | 0.0609 |
| ROUGE-L F1 | 0.1491 |

**By length band:**

| Band | n | Latency | ROUGE-L F1 |
|---|---|---|---|
| 500w | 6 | 16,309 ms | 0.1719 |
| 2,000w | 7 | 17,643 ms | 0.1304 |
| 5,000w | 7 | 18,617 ms | 0.1481 |

**By domain:**

| Domain | n | Latency | ROUGE-L F1 |
|---|---|---|---|
| Computer science | 7 | 15,997 ms | 0.1558 |
| Humanities | 7 | 18,413 ms | 0.1641 |
| Natural sciences | 6 | 18,467 ms | 0.1236 |

## Observations for the write-up

- **No clean monotonic drop with document length**, unlike the ~4,000-word quality cliff Wang et al. (2022) observed for GPT-3 summarisation (the literature-survey finding that originally motivated stratifying the corpus by length — see the project proposal §3.2). 5,000-word documents actually scored slightly *higher* ROUGE-L than 2,000-word ones here. A plausible reason worth stating cautiously (not proven by this run alone): Distill's system prompt fixes the target summary shape at a hard ~150-word cap with three fixed labelled sections (MAIN ARGUMENT / KEY POINTS / IMPLICATIONS) regardless of input length, which may compress the length-sensitivity that free-form summarisation shows — condensation ratio grows with input length, but the *target* structure doesn't change.
- **Latency scales gently with length** (16.3s → 18.6s from 500w to 5000w) — token throughput dominates, not some latency cliff.
- **Absolute ROUGE scores are modest** (ROUGE-1 ≈0.28, ROUGE-L ≈0.15) compared to Wang et al.'s reported 81% proposition-preservation figure — but that figure isn't ROUGE-comparable (theirs is a mix of ROUGE *and* human judgement against gold-standard summaries, not a lead-section proxy). Worth flagging as a limitation of using each article's lead section as the reference: a Wikipedia lead section is written as a dense, comprehensive overview of the whole article, while Distill's system prompt is instructed to produce a much shorter, differently-structured artefact optimised for spaced-repetition review rather than for maximising n-gram overlap with a reference. Low ROUGE here plausibly reflects a legitimate difference in what "a good summary" means for the two use cases, not necessarily poor pipeline quality — this is exactly the kind of nuance O6's critical reflection section should unpack rather than reporting the numbers at face value.
- **A real bug was found and fixed by this run** — see the "What testing actually happened" note below. Worth mentioning in the methodology section as evidence the benchmark harness earns its keep beyond producing numbers.

## What testing actually happened (methodology note for O6)

The live run was not a single clean pass — it surfaced a genuine bug on the very first API call, which is itself worth documenting as part of the testing methodology:

1. **First attempt failed immediately** with `Error: Expected a text response from the Claude API` on the very first document (`cs-500-1`), before any cache was written.
2. **Root cause**: `claude-sonnet-5` runs adaptive thinking by default whenever the `thinking` request parameter is omitted (a behavioural change from the older `claude-sonnet-4-6` this app previously used). That means a `thinking` content block can now precede the `text` block in the API response. Both `src/lib/ai-adapter.ts` (the app's own client-side call) and `benchmark/run-benchmark.ts` (this script) had independently written `message.content[0]` to grab the response text, assuming it was always the first block — an assumption that held under the old model but silently broke under the new one.
3. **Caught by**: a live end-to-end test (`src/lib/ai-adapter.live.test.ts`, added specifically to exercise the real API rather than a mock) that was run once as part of verifying the model-selection change *before* this benchmark. It reproduced the same failure the benchmark later hit, which is what made root-causing the benchmark's first failure fast — the fix was already known and already applied to `ai-adapter.ts` by the time the benchmark ran. The benchmark script itself had a *second, independent* copy of the same broken assumption (it doesn't import `ai-adapter.ts`'s parsing helper), which the benchmark's own failure caught and which the live test alone would not have caught.
4. **Fix**: both files now find the first block with `type === 'text'` (`message.content.find(b => b.type === 'text')`) instead of indexing `[0]`.
5. **Re-run behaviour**: the harness's existing cache-per-document design (`benchmark/cache/<id>.json`, written immediately after each successful call) meant the fix didn't require re-running from scratch. A second live run also hit the tool's 5-minute background-command timeout after completing 17 of 20 documents (an execution-environment limit, not an app or script bug) — the script's "skip anything already cached" check meant a third invocation simply resumed with the 3 remaining documents rather than re-spending on the 17 already-scored ones. All 20/20 scored across these three invocations combined, with no manual cache editing.

**Why this is worth including in the dissertation**: it's a concrete illustration of why the corpus/harness were built to be exercised against the real API before being trusted, and why the benchmark script deliberately imports the same shared prompt/model constants the live app uses (`src/lib/ai-shared.ts`) rather than a hand-copied approximation — even so, it still carried an independent, undetected implementation of the response-parsing logic, which is exactly the kind of drift that sharing constants doesn't protect against on its own. Both the live test and the benchmark run functioned as genuine tests here, not just data-collection scripts: they found a real, previously-undiscovered defect caused directly by the model migration this session performed (Sonnet 4.6 → Sonnet 5), not a benchmark-harness-specific issue.
