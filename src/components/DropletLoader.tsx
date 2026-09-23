import { useId } from 'react'

interface DropletLoaderProps {
  className?: string
  label?: string
}

// A droplet falling into water with expanding ripples, echoing the Distill logo mark — shown wherever the app is waiting on Claude.
export default function DropletLoader({ className = 'h-10 w-10', label }: DropletLoaderProps) {
  const gradientId = useId()

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <svg viewBox="136 96 240 420" className={className} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="156" y1="116" x2="356" y2="396" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7fb88f" />
            <stop offset="55%" stopColor="#4a7c59" />
            <stop offset="100%" stopColor="#2d5a3d" />
          </linearGradient>
        </defs>

        {/* still pool of water the droplet falls into */}
        <ellipse cx="256" cy="420" rx="95" ry="12" fill={`url(#${gradientId})`} opacity="0.12" />

        {/* two rings, staggered so a new ripple starts as the previous one fades */}
        <ellipse
          className="droplet-loader-ripple"
          cx="256"
          cy="420"
          rx="22"
          ry="6"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="4"
        />
        <ellipse
          className="droplet-loader-ripple droplet-loader-ripple-delay"
          cx="256"
          cy="420"
          rx="22"
          ry="6"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="4"
        />

        {/* the falling droplet, same shape as the logo mark */}
        <path
          className="droplet-loader-fall"
          d="M256,116 C256,116 356,290 356,340 C356,375 310,396 256,396 C202,396 156,375 156,340 C156,290 256,116 256,116 Z"
          fill={`url(#${gradientId})`}
        />
      </svg>
      {label ? <p className="font-body text-sm text-forest">{label}</p> : <span className="sr-only">Loading…</span>}
    </div>
  )
}
