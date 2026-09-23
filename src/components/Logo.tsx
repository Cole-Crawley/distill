import { useId } from 'react'

interface LogoProps {
  className?: string
}

// The droplet mark from the PWA icon (public/icon.svg), cropped for use as an inline logo next to the "Distill" wordmark. useId keeps the gradient id unique if the logo ever renders more than once on a page.
export default function Logo({ className = 'h-5 w-5' }: LogoProps) {
  const gradientId = useId()

  return (
    <svg viewBox="136 96 240 320" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="156" y1="116" x2="356" y2="396" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7fb88f" />
          <stop offset="55%" stopColor="#4a7c59" />
          <stop offset="100%" stopColor="#2d5a3d" />
        </linearGradient>
      </defs>
      <path
        d="M256,116 C256,116 356,290 356,340 C356,375 310,396 256,396 C202,396 156,375 156,340 C156,290 256,116 256,116 Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  )
}
