import Dexie, { type Table } from 'dexie'
import type { Document, Card, Session, DocumentRelationship, SourceAttachment } from '../types'

export class DistillDB extends Dexie {
  documents!: Table<Document>
  cards!: Table<Card>
  sessions!: Table<Session>
  relationships!: Table<DocumentRelationship>
  sources!: Table<SourceAttachment>

  constructor() {
    super('distill')
    this.version(1).stores({
      documents: '++id, createdAt, title, sourceType, topic',
      cards: '++id, documentId, due, status',
      sessions: '++id, completedAt',
      relationships: '++id, sourceDocumentId, targetDocumentId',
    })
    // v2 adds `sources`: one row per upload attached to a note, so the
    // original extracted text can always be viewed in full later, separate
    // from whatever the note body has since become.
    this.version(2).stores({
      documents: '++id, createdAt, title, sourceType, topic',
      cards: '++id, documentId, due, status',
      sessions: '++id, completedAt',
      relationships: '++id, sourceDocumentId, targetDocumentId',
      sources: '++id, documentId, createdAt',
    })
    // v3 adds `lastReviewedAt` to cards, so the Progress page can show how many cards were
    // studied today per note — previously reconstructable only as a global total across all
    // notes combined, since sessions deliberately carry no per-document breakdown (see O5, PR-2).
    this.version(3).stores({
      documents: '++id, createdAt, title, sourceType, topic',
      cards: '++id, documentId, due, status, lastReviewedAt',
      sessions: '++id, completedAt',
      relationships: '++id, sourceDocumentId, targetDocumentId',
      sources: '++id, documentId, createdAt',
    })
  }
}

export const db = new DistillDB()
