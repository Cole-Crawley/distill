import type { TopicCategory } from '../../types'

export const TOPIC_COLOURS: Record<TopicCategory, string> = {
  'machine-learning': '#4a7c59',
  science: '#2d6a9f',
  history: '#8b5e3c',
  technology: '#5b4fcf',
  business: '#b45309',
  health: '#be185d',
  other: '#78716c',
}

export const TOPIC_LABELS: Record<TopicCategory, string> = {
  'machine-learning': 'ML / AI',
  science: 'Science',
  history: 'History',
  technology: 'Technology',
  business: 'Business',
  health: 'Health',
  other: 'Other',
}

export function topicColour(topic: TopicCategory): string {
  return TOPIC_COLOURS[topic] ?? TOPIC_COLOURS.other
}
