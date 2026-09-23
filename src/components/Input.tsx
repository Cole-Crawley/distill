import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export default function Input({ className = '', ...props }: InputProps) {
  const classes = [
    'bg-cream border border-border-warm rounded focus:border-forest focus:outline-none focus:ring-0 px-3 h-10 font-body text-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <input className={classes} {...props} />
}
