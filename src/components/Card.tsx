import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export default function Card({ className = '', ...props }: CardProps) {
  const classes = ['bg-surface border border-border-warm rounded shadow-warm p-6', className]
    .filter(Boolean)
    .join(' ')

  return <div className={classes} {...props} />
}
