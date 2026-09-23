import { db } from './db'

export async function createBlankNote(): Promise<number> {
  return db.documents.add({
    title: 'Untitled',
    rawText: '',
    contentHtml: '',
    summary: '',
    wordCount: 0,
    sourceType: 'text',
    topic: 'other',
    topicKeywords: [],
    createdAt: new Date(),
    cardCount: 0,
  })
}

// "Let's get started" used to add a fresh Untitled note on every click, so
// anyone returning to the welcome screen built up a pile of empty notes.
// Reuse the newest note that's still completely empty instead.
export async function openBlankNote(): Promise<number> {
  const empty = await db.documents
    .filter(d => d.title === 'Untitled' && d.rawText.trim() === '' && d.cardCount === 0)
    .last()
  if (empty?.id != null) return empty.id
  return createBlankNote()
}

// Cascades so a deleted note doesn't leave orphaned cards/sources/relationship edges behind.
export async function deleteNote(documentId: number): Promise<void> {
  await db.transaction('rw', db.documents, db.cards, db.sources, db.relationships, async () => {
    await db.cards.where('documentId').equals(documentId).delete()
    await db.sources.where('documentId').equals(documentId).delete()
    await db.relationships.where('sourceDocumentId').equals(documentId).delete()
    await db.relationships.where('targetDocumentId').equals(documentId).delete()
    await db.documents.delete(documentId)
  })
}
