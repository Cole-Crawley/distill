import type { CardState } from '../types'

// SM-2 spaced-repetition algorithm: takes a card's current state and how well you just recalled it, returns when it should next be shown.
export function calculateNextReview(state: CardState, quality: number): CardState {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new Error('quality must be an integer between 0 and 5')
  }

  // Quality 3+ counts as "remembered it"; below that is a miss.
  const passed = quality >= 3

  // A miss resets the correct-in-a-row streak back to zero.
  const repetition = passed ? state.repetition + 1 : 0

  // Work out how many days until the card is due again.
  let interval: number
  if (!passed) {
    interval = 1 // missed it — see it again tomorrow
  } else if (state.repetition === 0) {
    interval = 1 // first correct answer — short gap to confirm it stuck
  } else if (state.repetition === 1) {
    interval = 6 // second correct answer in a row — SM-2's fixed 6-day jump
  } else {
    interval = Math.round(state.interval * state.easeFactor) // grows the gap each time, faster for easier cards
  }

  // Nudge the "how easy is this card" score based on how easy quality 3-5 felt; leave it alone on a miss.
  const easeFactor = passed
    ? Math.max(1.3, state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    : state.easeFactor

  // Set the due date to the start of the day, `interval` days from now.
  const due = new Date()
  due.setDate(due.getDate() + interval)
  due.setHours(0, 0, 0, 0)

  return { interval, repetition, easeFactor, due }
}
