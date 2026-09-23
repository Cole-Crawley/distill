import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { calculateMastery } from '../lib/mastery'
import Badge from '../components/Badge'
import MiniChart from '../components/MiniChart'
import type { Card, Document, Session } from '../types'

const DAYS_TO_SHOW = 30
const MAX_SESSIONS_SHOWN = 20

// Stable empty-array references so a loading useLiveQuery doesn't break useMemo's memoisation.
const EMPTY_SESSIONS: Session[] = []
const EMPTY_DOCUMENTS: Document[] = []
const EMPTY_CARDS: Card[] = []

// Sums cards reviewed per calendar day over the last 30 days, filling in zeros so the bar chart has no gaps.
function buildDailyReviewData(sessions: Session[]) {
  const countsByDate = new Map<string, number>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: { key: string; label: string }[] = []
  for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    const key = day.toISOString().slice(0, 10)
    countsByDate.set(key, 0)
    days.push({ key, label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
  }

  for (const session of sessions) {
    const key = new Date(session.completedAt).toISOString().slice(0, 10)
    if (countsByDate.has(key)) {
      countsByDate.set(key, (countsByDate.get(key) ?? 0) + session.cardCount)
    }
  }

  return days.map(day => ({ date: day.label, count: countsByDate.get(day.key) ?? 0 }))
}

// Retention % per session = cards rated 3+ (a pass) out of total reviewed, so the trend line shows recall improving over time.
function buildRetentionData(sessions: Session[]) {
  const sorted = [...sessions].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
  return sorted.slice(-MAX_SESSIONS_SHOWN).map((session, index) => ({
    session: `#${index + 1}`,
    retention: session.cardCount > 0 ? Math.round((session.correctCount / session.cardCount) * 100) : 0,
  }))
}

export default function ProgressPage() {
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? EMPTY_SESSIONS
  const documents = useLiveQuery(() => db.documents.toArray()) ?? EMPTY_DOCUMENTS
  const cards = useLiveQuery(() => db.cards.toArray()) ?? EMPTY_CARDS

  const dailyReviews = useMemo(() => buildDailyReviewData(sessions), [sessions])
  const retention = useMemo(() => buildRetentionData(sessions), [sessions])

  // One row per note, using the same calculateMastery() the Knowledge Map uses so the percentages always match.
  const deckRows = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    return documents
      .map(doc => {
        const docCards = cards.filter(card => card.documentId === doc.id)
        const dueToday = docCards.filter(card => card.due <= endOfToday).length
        // Distinct from `dueToday` (what's still owed): this is what was actually studied today,
        // for this specific note — previously not reconstructable at all, since lastReviewedAt
        // didn't exist and sessions carry no per-document breakdown (O5, PR-2).
        const reviewedToday = docCards.filter(
          card => card.lastReviewedAt && card.lastReviewedAt >= startOfToday && card.lastReviewedAt <= endOfToday
        ).length
        const { masteryScore } = calculateMastery(docCards)
        return { ...doc, dueToday, reviewedToday, masteryScore }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [documents, cards])

  return (
    <div className="h-full overflow-y-auto bg-cream px-10 py-8">
      <h1 className="font-display text-2xl text-stone-ink">Progress</h1>
      <p className="mt-2 font-body text-stone-muted">Track your review activity and retention over time.</p>

      <div className="mt-8 flex flex-col gap-8">
        <section>
          <p className="mb-3 font-mono text-xs uppercase tracking-wide text-stone-muted">
            Cards reviewed, last 30 days
          </p>
          <div className="h-56 rounded border border-border-warm bg-surface p-4">
            <MiniChart
              type="bar"
              data={dailyReviews.map(d => ({ label: d.date, value: d.count }))}
              valueSuffix=" cards"
              labelEvery={5}
            />
          </div>
        </section>

        <section>
          <p className="mb-3 font-mono text-xs uppercase tracking-wide text-stone-muted">Retention per session</p>
          {retention.length === 0 ? (
            <div className="flex h-56 items-center justify-center rounded border border-border-warm bg-surface">
              <p className="font-body text-sm text-stone-muted">Study a session to start tracking retention.</p>
            </div>
          ) : (
            <div className="h-56 rounded border border-border-warm bg-surface p-4">
              <MiniChart
                type="line"
                data={retention.map(d => ({ label: d.session, value: d.retention }))}
                valueSuffix="%"
                yMax={100}
              />
            </div>
          )}
        </section>

        <section>
          <p className="mb-3 font-mono text-xs uppercase tracking-wide text-stone-muted">Deck overview</p>
          {deckRows.length === 0 ? (
            <p className="font-body text-sm text-stone-muted">Nothing here yet. Write or upload a note to get started.</p>
          ) : (
            <div className="overflow-x-auto rounded border border-border-warm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-warm bg-surface">
                    <th className="whitespace-nowrap px-4 py-2 font-mono text-xs uppercase tracking-wide text-stone-muted">
                      Note
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-mono text-xs uppercase tracking-wide text-stone-muted">
                      Source
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-mono text-xs uppercase tracking-wide text-stone-muted">
                      Cards
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-mono text-xs uppercase tracking-wide text-stone-muted">
                      Due today
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-mono text-xs uppercase tracking-wide text-stone-muted">
                      Reviewed today
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 font-mono text-xs uppercase tracking-wide text-stone-muted">
                      Mastery
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deckRows.map(row => (
                    <tr key={row.id} className="border-b border-border-warm last:border-0">
                      <td className="px-4 py-2 font-body text-sm text-stone-ink">
                        <Link to={`/notes/${row.id}`} className="hover:text-forest">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Badge>{row.sourceType.toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-stone-muted">{row.cardCount}</td>
                      <td className="px-4 py-2 font-mono text-xs text-stone-muted">{row.dueToday}</td>
                      <td className="px-4 py-2 font-mono text-xs text-stone-muted">{row.reviewedToday}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border-warm">
                            <div
                              className="h-full rounded-full bg-forest"
                              style={{ width: `${Math.round(row.masteryScore * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-stone-muted">
                            {Math.round(row.masteryScore * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
