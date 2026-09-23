import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded font-body font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-forest text-cream hover:bg-forest-dark',
  secondary: 'bg-surface text-stone-ink border border-border-warm hover:bg-forest-light',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const classes = [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} {...props} />
}
