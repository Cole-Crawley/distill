// Model/prompt constants and pure parsing helpers shared between the browser
// AI adapter (ai-adapter.ts) and the Node-side benchmarking script
// (benchmark/run-benchmark.ts). Kept free of any browser-only or Node-only
// APIs so both environments can import it unchanged — this is what
// guarantees the benchmark measures the exact same prompt the real app
// sends, not a re-typed approximation of it.

// analyseDocument is the harder, generative task (summary + 8-15 flashcards + topic +
// keywords from arbitrary-length source text) and is what O4's ROUGE benchmark measures,
// so it gets the more capable model. detectRelationships is a bounded, more classification-
// like comparison against a short list of existing-doc summaries, so it runs on the cheaper,
// faster model instead.
export const ANALYSE_MODEL = 'claude-sonnet-5'
export const RELATIONSHIPS_MODEL = 'claude-haiku-4-5'

export const ANALYSE_SYSTEM_PROMPT = `You are a study assistant. Analyse the following document and return a single valid JSON object.
No markdown. No backticks. No explanation. No preamble. Return only the JSON object.

The object must have exactly these fields:
{
  "summary": "structured summary with three labelled sections: MAIN ARGUMENT (one sentence), KEY POINTS (3-5 bullet points starting with -), IMPLICATIONS (one sentence). Under 150 words total.",
  "cards": [array of 8-15 flashcard objects, each with "front" (string), "back" (string), "type" ("qa"|"cloze"|"definition")],
  "topic": one of exactly: "machine-learning", "science", "history", "technology", "business", "health", "other",
  "keywords": [array of 8-12 strings, the most important concepts and terms from this document]
}

For cloze cards: front is a sentence with the key term replaced by [...].
For definition cards: front is the term, back is the definition.
For qa cards: front is a question, back is a direct answer.`

export const RELATIONSHIPS_SYSTEM_PROMPT = `You are a knowledge graph assistant. A new document has been added to a personal knowledge base.
Identify which existing documents are meaningfully related to the new document.
Return ONLY a valid JSON array. No markdown. No backticks. No explanation. No preamble.

Each object in the array must have:
{
  "targetDocumentId": (number — the id of the related existing document),
  "relationshipType": one of "related", "prerequisite", "contradicts", "extends",
  "strength": (number between 0.1 and 1.0 — how strongly related they are),
  "reason": (string — one sentence explaining the connection)
}

Only include documents with genuine meaningful connections (strength >= 0.3).
Return an empty array [] if no strong connections exist.
Do not invent connections. Be conservative.`

// Claude is told to return raw JSON, but strip accidental ```code fences``` just in case.
export function extractJsonText(rawText: string): string {
  const trimmed = rawText.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fenced ? fenced[1] : trimmed
}
