import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  // 'muted' signals a neutral/unsupported state — deliberately not the affirmative green,
  // so a badge never implies something will work when it won't (see DI-2 heuristic finding).
  tone?: 'default' | 'muted'
}

export default function Badge({ className = '', tone = 'default', ...props }: BadgeProps) {
  const toneClasses = tone === 'muted' ? 'bg-surface text-stone-muted' : 'bg-forest-light text-forest'
  const classes = [toneClasses, 'font-mono text-xs rounded-sm px-2 py-0.5', className].filter(Boolean).join(' ')

  return <span className={classes} {...props} />
}
