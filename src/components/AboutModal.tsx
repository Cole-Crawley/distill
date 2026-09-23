import { X } from 'lucide-react'
import Logo from './Logo'

interface AboutModalProps {
  onClose: () => void
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col rounded border border-border-warm bg-cream shadow-warm"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-warm px-6 py-4">
          <div className="flex items-center gap-2">
            <Logo />
            <h2 className="font-display text-lg leading-snug text-stone-ink">Distill</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-stone-muted hover:text-stone-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-6 font-body text-sm leading-relaxed text-stone-ink">
          <p>
            An AI-augmented spaced repetition app. Upload or write anything, let Claude turn it into a
            summary and flashcards, then review on a schedule tuned by the SM-2 algorithm.
          </p>
          <p className="text-stone-muted">
            Local-first: your notes and cards live in this browser's IndexedDB storage, not on a server.
            Documents are only sent to Claude when you ask the app to analyse them.
          </p>
          <p className="font-mono text-xs text-stone-muted">v0.0.1, an MSc dissertation artefact</p>
        </div>
      </div>
    </div>
  )
}
