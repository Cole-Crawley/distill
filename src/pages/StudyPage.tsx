import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { calculateNextReview } from '../lib/sm2'
import { TOPIC_LABELS } from '../features/knowledge-map/mapColours'
import Flashcard from '../features/study/Flashcard'
import QualityButtons from '../features/study/QualityButtons'
import Button from '../components/Button'
import type { Card, Document, TopicCategory } from '../types'

interface QueueCard extends Card {
  documentTitle: string
}

// SS-3: lets a session be scoped to one note or one topic instead of always
// pulling every due card across every note combined — 'all' keeps the
// original behaviour.
type StudyScope = { type: 'all' } | { type: 'topic'; topic: TopicCategory } | { type: 'document'; documentId: number }

const ALL_SCOPE: StudyScope = { type: 'all' }

function scopeKey(scope: StudyScope): string {
  if (scope.type === 'all') return 'all'
  if (scope.type === 'topic') return `topic:${scope.topic}`
  return `document:${scope.documentId}`
}

function parseScopeKey(key: string): StudyScope {
  if (key === 'all') return ALL_SCOPE
  if (key.startsWith('topic:')) return { type: 'topic', topic: key.slice(6) as TopicCategory }
  return { type: 'document', documentId: Number(key.slice(9)) }
}

function cardMatchesScope(card: Card, scope: StudyScope, documentTopicById: Map<number, TopicCategory>): boolean {
  if (scope.type === 'all') return true
  if (scope.type === 'document') return card.documentId === scope.documentId
  return documentTopicById.get(card.documentId) === scope.topic
}

// Groups documents by topic, same pattern as the sidebar, so the scope picker's options are
// organised the same way a user already expects notes to be grouped.
function groupByTopic(documents: Document[]): Array<{ topic: TopicCategory; documents: Document[] }> {
  const groups = new Map<TopicCategory, Document[]>()
  for (const doc of documents) {
    const bucket = groups.get(doc.topic) ?? []
    bucket.push(doc)
    groups.set(doc.topic, bucket)
  }
  return Array.from(groups.entries())
    .map(([topic, docs]) => ({ topic, documents: docs.sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => TOPIC_LABELS[a.topic].localeCompare(TOPIC_LABELS[b.topic]))
}

export default function StudyPage() {
  const documents = useLiveQuery(() => db.documents.toArray())
  const [scope, setScope] = useState<StudyScope>(ALL_SCOPE)
  const [queue, setQueue] = useState<QueueCard[] | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studied, setStudied] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [complete, setComplete] = useState(false)

  const topicGroups = useMemo(() => groupByTopic(documents ?? []), [documents])

  const scopeLabel = useMemo(() => {
    if (scope.type === 'all') return 'all notes'
    if (scope.type === 'topic') return TOPIC_LABELS[scope.topic]
    return documents?.find(doc => doc.id === scope.documentId)?.title || 'this note'
  }, [scope, documents])

  useEffect(() => {
    if (documents === undefined) return // still loading — the topic lookup below needs real data
    void loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, scope])

  // Lets a rating be given with the keyboard (0-5) instead of a mouse click — the most
  // frequently repeated action in the app, and the one place a shortcut pays off most.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isFlipped) return
      if (event.key >= '0' && event.key <= '5') {
        void handleRate(Number(event.key))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, queue, studied, correct, startedAt])

  async function loadQueue() {
    const dueCards = await db.cards.where('due').belowOrEqual(new Date()).toArray()
    const docs = documents ?? (await db.documents.toArray())
    const titleById = new Map(docs.map(doc => [doc.id, doc.title]))
    const topicById = new Map(docs.map(doc => [doc.id!, doc.topic]))
    setQueue(
      dueCards
        .filter(card => cardMatchesScope(card, scope, topicById))
        .map(card => ({
          ...card,
          documentTitle: titleById.get(card.documentId) ?? 'Untitled',
        }))
    )
  }

  function handleScopeChange(key: string) {
    setScope(parseScopeKey(key))
    setStudied(0)
    setCorrect(0)
    setComplete(false)
    setIsFlipped(false)
    setStartedAt(Date.now())
    // loadQueue re-runs automatically via the effect above, since `scope` is a dependency.
  }

  // Sends the card's current state and your recall quality (0-5) to SM-2, then saves the new schedule right away.
  async function handleRate(quality: number) {
    if (!queue || queue.length === 0) return
    const currentCard = queue[0]

    const nextState = calculateNextReview(
      {
        interval: currentCard.interval,
        repetition: currentCard.repetition,
        easeFactor: currentCard.easeFactor,
        due: currentCard.due,
      },
      quality
    )
    const status: Card['status'] = quality < 3 ? 'learning' : 'review'
    await db.cards.update(currentCard.id!, { ...nextState, status, lastReviewedAt: new Date() })

    const passed = quality >= 3
    const newStudied = studied + 1
    const newCorrect = correct + (passed ? 1 : 0)
    setStudied(newStudied)
    setCorrect(newCorrect)
    setIsFlipped(false)

    // A pass removes the card from today's queue; a fail sends it to the back to try again this session.
    const rest = queue.slice(1)
    const nextQueue = passed ? rest : [...rest, { ...currentCard, ...nextState, status }]

    if (nextQueue.length === 0) {
      await db.sessions.add({
        completedAt: new Date(),
        cardCount: newStudied,
        correctCount: newCorrect,
        durationMs: Date.now() - startedAt,
      })
      setComplete(true)
    }
    setQueue(nextQueue)
  }

  function handleRestart() {
    setStudied(0)
    setCorrect(0)
    setComplete(false)
    setIsFlipped(false)
    setStartedAt(Date.now())
    void loadQueue()
  }

  const scopePicker = (
    <select
      value={scopeKey(scope)}
      onChange={event => handleScopeChange(event.target.value)}
      className="rounded border border-border-warm bg-surface px-2 py-1 font-body text-xs text-stone-ink focus:border-forest focus:outline-none"
    >
      <option value="all">All notes</option>
      {topicGroups.map(group => (
        <optgroup key={group.topic} label={TOPIC_LABELS[group.topic]}>
          <option value={`topic:${group.topic}`}>All of {TOPIC_LABELS[group.topic]}</option>
          {group.documents.map(doc => (
            <option key={doc.id} value={`document:${doc.id}`}>
              {doc.title || 'Untitled'}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  if (queue === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-body text-sm text-stone-muted">Loading...</p>
      </div>
    )
  }

  if (complete) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
        <h1 className="font-display text-2xl text-stone-ink">Session complete</h1>
        <p className="font-body text-sm text-stone-muted">
          {studied} {studied === 1 ? 'card' : 'cards'} reviewed · {correct} correct ·{' '}
          {Math.round((Date.now() - startedAt) / 1000)}s
        </p>
        <Button onClick={handleRestart}>Study more</Button>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
        <div className="mb-2">{scopePicker}</div>
        <h1 className="font-display text-2xl text-stone-ink">You&apos;re all caught up</h1>
        <p className="font-body text-sm text-stone-muted">
          No cards are due for review right now in {scopeLabel}.
        </p>
      </div>
    )
  }

  const currentCard = queue[0]

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-10 py-8">
      <div className="flex flex-col items-center gap-2">
        {scopePicker}
        <p className="font-mono text-xs text-stone-muted">
          {queue.length} {queue.length === 1 ? 'card' : 'cards'} remaining
        </p>
      </div>

      <div className="h-80 w-full max-w-lg">
        <Flashcard
          front={currentCard.front}
          back={currentCard.back}
          documentTitle={currentCard.documentTitle}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(flipped => !flipped)}
        />
      </div>

      {isFlipped ? (
        <div className="w-full max-w-lg">
          <QualityButtons onRate={handleRate} />
        </div>
      ) : (
        <Button onClick={() => setIsFlipped(true)}>Show answer</Button>
      )}
    </div>
  )
}
