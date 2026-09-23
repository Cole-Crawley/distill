// ── Content ingestion ─────────────────────────────────────────────────────
// 'youtube' was removed: YouTube blocks requests from browser-only apps like Distill, even through CORS proxies.
export type SourceType = 'pdf' | 'epub' | 'docx' | 'url' | 'text'

export type TopicCategory =
  | 'machine-learning'
  | 'science'
  | 'history'
  | 'technology'
  | 'business'
  | 'health'
  | 'other'

export interface SourceMetadata {
  author?: string
  publishedDate?: string
  siteName?: string
}

export interface IngestedContent {
  title: string
  rawText: string
  wordCount: number
  sourceType: SourceType
  sourceUrl?: string
  metadata?: SourceMetadata
}

// ── Database models ───────────────────────────────────────────────────────
export interface Document {
  id?: number
  title: string
  rawText: string
  contentHtml: string // rich-text body as edited in the notes canvas
  summary: string
  wordCount: number
  sourceType: SourceType
  sourceUrl?: string
  metadata?: SourceMetadata
  topic: TopicCategory
  topicKeywords: string[] // AI-extracted keywords for relationship detection
  createdAt: Date
  cardCount: number
}

// One upload attached to a note; never edited after creation, so "view original upload" always shows the real thing.
export interface SourceAttachment {
  id?: number
  documentId: number
  title: string
  rawText: string // the full, untouched extracted text
  sourceType: SourceType
  sourceUrl?: string
  metadata?: SourceMetadata
  wordCount: number
  wasClarified: boolean // true if the user chose to condense this before it was inserted into the note
  createdAt: Date
}

export interface CardState {
  interval: number
  repetition: number
  easeFactor: number
  due: Date
}

export interface Card extends CardState {
  id?: number
  documentId: number
  front: string
  back: string
  type: 'qa' | 'cloze' | 'definition'
  status: 'new' | 'learning' | 'review'
  createdAt: Date
  lastReviewedAt?: Date // set on every study-session rating, so "reviewed today" can be shown per note on the Progress page
}

export interface Session {
  id?: number
  completedAt: Date
  cardCount: number
  correctCount: number
  durationMs: number
}

// ── Knowledge map ─────────────────────────────────────────────────────────
export interface DocumentRelationship {
  id?: number
  sourceDocumentId: number
  targetDocumentId: number
  relationshipType: 'related' | 'prerequisite' | 'contradicts' | 'extends'
  strength: number // 0.0–1.0, used to set edge weight in D3
  reason: string // one-sentence AI explanation of why they're related
  createdAt: Date
}

// MapNode is derived at runtime from Document + Card stats — not stored
export interface MapNode {
  id: number
  title: string
  topic: TopicCategory
  masteryScore: number // 0.0–1.0 derived from avg easeFactor of cards
  reviewCount: number // total cards reviewed across all sessions
  cardCount: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface MapEdge {
  source: number | MapNode
  target: number | MapNode
  strength: number
  relationshipType: string
  reason: string
}

// ── AI layer ─────────────────────────────────────────────────────────────
export interface RawCard {
  front: string
  back: string
  type: 'qa' | 'cloze' | 'definition'
}

export interface AIDocumentAnalysis {
  summary: string
  cards: RawCard[]
  topic: TopicCategory
  keywords: string[]
}

export interface AIRelationship {
  targetDocumentId: number
  relationshipType: 'related' | 'prerequisite' | 'contradicts' | 'extends'
  strength: number
  reason: string
}

export interface AIProvider {
  analyseDocument(text: string, signal?: AbortSignal): Promise<AIDocumentAnalysis>
  detectRelationships(
    newDoc: { title: string; summary: string; keywords: string[] },
    existingDocs: Array<{ id: number; title: string; summary: string; keywords: string[] }>,
    signal?: AbortSignal
  ): Promise<AIRelationship[]>
}

// ── Extractor interface ───────────────────────────────────────────────────
export interface ContentExtractor {
  canHandle(input: string | File): boolean
  extract(input: string | File): Promise<IngestedContent>
}
