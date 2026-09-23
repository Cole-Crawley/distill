import { X } from 'lucide-react'
import Badge from '../../components/Badge'
import type { SourceAttachment } from '../../types'

interface SourceViewerModalProps {
  attachment: SourceAttachment
  onClose: () => void
}

// Splits raw extracted text into paragraphs: tries blank-line breaks first, then single newlines, then gives up and leaves it as one block.
function splitIntoParagraphs(rawText: string): string[] {
  const byBlankLine = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  if (byBlankLine.length > 1) return byBlankLine

  const bySingleLine = rawText.split(/\n/).map(p => p.trim()).filter(Boolean)
  if (bySingleLine.length > 1) return bySingleLine

  return [rawText.trim()]
}

export default function SourceViewerModal({ attachment, onClose }: SourceViewerModalProps) {
  const paragraphs = splitIntoParagraphs(attachment.rawText)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded border border-border-warm bg-cream shadow-warm"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-warm px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-lg leading-snug text-stone-ink">{attachment.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{attachment.sourceType.toUpperCase()}</Badge>
              <span className="font-mono text-xs text-stone-muted">
                {attachment.wordCount.toLocaleString()} words
              </span>
              {attachment.metadata?.author && (
                <span className="font-body text-xs text-stone-muted">by {attachment.metadata.author}</span>
              )}
              {attachment.metadata?.siteName && (
                <span className="font-body text-xs text-stone-muted">{attachment.metadata.siteName}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-stone-muted hover:text-stone-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="font-body text-base leading-relaxed text-stone-ink">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
