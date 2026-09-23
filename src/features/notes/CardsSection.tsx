import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { db } from '../../lib/db'
import ConfirmDialog from '../../components/ConfirmDialog'

interface CardsSectionProps {
  documentId: number
}

export default function CardsSection({ documentId }: CardsSectionProps) {
  const cards = useLiveQuery(() => db.cards.where('documentId').equals(documentId).toArray(), [documentId]) ?? []
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftFront, setDraftFront] = useState('')
  const [draftBack, setDraftBack] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  async function syncCardCount() {
    const count = await db.cards.where('documentId').equals(documentId).count()
    await db.documents.update(documentId, { cardCount: count })
  }

  function startEdit(card: { id?: number; front: string; back: string }) {
    setEditingId(card.id ?? null)
    setDraftFront(card.front)
    setDraftBack(card.back)
  }

  // addCard() inserts an empty card into the DB immediately (so it can be opened in the inline
  // editor right away) — if the user then cancels or saves without typing anything, that empty
  // card would otherwise persist forever: it counts toward the card total and, worse, would turn
  // up mid-study-session as a blank question with a blank answer. Both paths clean it up instead.
  async function deleteEmptyCard(id: number) {
    await db.cards.delete(id)
    setEditingId(null)
    await syncCardCount()
  }

  function cancelEdit() {
    const card = cards.find(c => c.id === editingId)
    if (card && !card.front && !card.back) {
      void deleteEmptyCard(card.id!)
    } else {
      setEditingId(null)
    }
  }

  async function saveEdit() {
    if (editingId === null) return
    const front = draftFront.trim()
    const back = draftBack.trim()
    if (!front && !back) {
      await deleteEmptyCard(editingId)
      return
    }
    await db.cards.update(editingId, { front, back })
    setEditingId(null)
  }

  async function confirmDeleteCard() {
    if (deleteTargetId === null) return
    await db.cards.delete(deleteTargetId)
    if (editingId === deleteTargetId) setEditingId(null)
    setDeleteTargetId(null)
    await syncCardCount()
  }

  async function addCard() {
    const id = await db.cards.add({
      documentId,
      front: '',
      back: '',
      type: 'qa',
      status: 'new',
      interval: 0,
      repetition: 0,
      easeFactor: 2.5,
      due: new Date(),
      createdAt: new Date(),
    })
    await syncCardCount()
    startEdit({ id, front: '', back: '' })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wide text-stone-muted">
          Cards{cards.length > 0 ? ` (${cards.length})` : ''}
        </p>
        <button
          onClick={addCard}
          className="flex items-center gap-1 font-body text-xs text-forest hover:text-forest-dark"
        >
          <Plus className="h-3.5 w-3.5" />
          Add card
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="font-body text-xs text-stone-muted">
          No flashcards yet. Use Clarify with AI, or add one manually.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map(card => (
            <div key={card.id} className="rounded border border-border-warm bg-cream p-3">
              {editingId === card.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    autoFocus
                    value={draftFront}
                    onChange={event => setDraftFront(event.target.value)}
                    placeholder="Front"
                    rows={2}
                    className="w-full resize-none rounded border border-border-warm bg-cream p-2 font-body text-sm text-stone-ink focus:border-forest focus:outline-none focus:ring-0"
                  />
                  <textarea
                    value={draftBack}
                    onChange={event => setDraftBack(event.target.value)}
                    placeholder="Back"
                    rows={2}
                    className="w-full resize-none rounded border border-border-warm bg-cream p-2 font-body text-sm text-stone-ink focus:border-forest focus:outline-none focus:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex items-center gap-1 rounded bg-forest px-2 py-1 font-body text-xs font-medium text-cream hover:bg-forest-dark"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 rounded border border-border-warm bg-surface px-2 py-1 font-body text-xs text-stone-muted hover:bg-cream"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-body text-sm text-stone-ink">
                      {card.front || <span className="text-stone-muted">Empty</span>}
                    </p>
                    <p className="font-body text-xs text-stone-muted">{card.back}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => startEdit(card)}
                      aria-label="Edit card"
                      className="rounded p-1 text-stone-muted hover:bg-forest-light hover:text-forest"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(card.id!)}
                      aria-label="Delete card"
                      className="rounded p-1 text-stone-muted hover:bg-forest-light hover:text-forest"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTargetId !== null && (
        <ConfirmDialog
          title="Delete this card?"
          description="This flashcard and its review history will be permanently deleted. This can't be undone."
          onConfirm={confirmDeleteCard}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  )
}
