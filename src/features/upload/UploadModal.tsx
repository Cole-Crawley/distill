import { useState } from 'react'
import { AlertCircle, Sparkles, Upload as UploadIcon, X } from 'lucide-react'
import { ingest } from './extractors'
import { detectInputMode, getSourceIcon, getSourceLabel } from './SourceTypeDetector'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import type { IngestedContent } from '../../types'

interface UploadModalProps {
  onClose: () => void
  // isUpload is true for a real file or fetched URL, false for plain pasted text (which has no separate original to attach).
  onExtracted: (content: IngestedContent, shouldClarify: boolean, isUpload: boolean) => void
}

// Below this many words, skip the "clarify first?" question and just insert the text.
const LONG_DOCUMENT_WORD_THRESHOLD = 500

type Stage = 'input' | 'confirm-clarify'

interface PendingExtraction {
  content: IngestedContent
  isUpload: boolean
}

export default function UploadModal({ onClose, onExtracted }: UploadModalProps) {
  const [stage, setStage] = useState<Stage>('input')
  const [textValue, setTextValue] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingExtraction | null>(null)

  const detectedMode = textValue.trim() ? detectInputMode(textValue.trim()) : null
  const canSubmit = (Boolean(file) || Boolean(textValue.trim())) && detectedMode !== 'video'

  async function handleSubmit() {
    setError(null)
    setIsLoading(true)
    const isUpload = Boolean(file) || detectedMode === 'url'
    try {
      const content = await ingest(file ?? textValue.trim())
      // A 0-byte file, or a file whose extractor found no readable text, would otherwise silently
      // "succeed" — an empty source pill and a title change with nothing actually added to the note.
      if (content.wordCount === 0) {
        setError("This file doesn't seem to contain any readable text.")
        return
      }
      if (content.wordCount > LONG_DOCUMENT_WORD_THRESHOLD) {
        setPending({ content, isUpload })
        setStage('confirm-clarify')
      } else {
        onExtracted(content, false, isUpload)
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while processing this.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClarifyChoice(shouldClarify: boolean) {
    if (!pending) return
    onExtracted(pending.content, shouldClarify, pending.isUpload)
    onClose()
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0] ?? null
    if (dropped) {
      setFile(dropped)
      setTextValue('')
      setError(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded border border-border-warm bg-cream p-6 shadow-warm"
        onClick={event => event.stopPropagation()}
      >
        {stage === 'confirm-clarify' && pending ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-stone-ink">Clarify before adding?</h2>
              <button onClick={onClose} className="text-stone-muted hover:text-stone-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <p className="font-body text-sm text-stone-muted">
                <span className="font-medium text-stone-ink">{pending.content.title}</span> is about{' '}
                {pending.content.wordCount.toLocaleString()} words. Distill can condense it into a short
                summary before adding it to your note, or add the full text as-is.
                {pending.isUpload &&
                  ' Either way, the original stays attached to this note so you can read it in full later.'}
              </p>

              <button
                onClick={() => handleClarifyChoice(true)}
                className="flex items-center gap-2 rounded bg-forest px-4 py-2.5 font-body text-sm font-medium text-cream transition-colors duration-150 hover:bg-forest-dark"
              >
                <Sparkles className="h-4 w-4" />
                Clarify, then add
              </button>
              <Button variant="secondary" onClick={() => handleClarifyChoice(false)}>
                Add full text as-is
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-stone-ink">Add to this note</h2>
              <button onClick={onClose} className="text-stone-muted hover:text-stone-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <textarea
                value={textValue}
                onChange={event => {
                  setTextValue(event.target.value)
                  if (event.target.value.trim()) setFile(null)
                  setError(null)
                }}
                placeholder="Paste an article URL, or plain text..."
                rows={4}
                className="w-full resize-none rounded border border-border-warm bg-cream p-3 font-body text-sm text-stone-ink focus:border-forest focus:outline-none focus:ring-0"
              />

              {detectedMode && (
                <Badge className="self-start" tone={detectedMode === 'video' ? 'muted' : 'default'}>
                  {getSourceIcon(detectedMode)} {getSourceLabel(detectedMode)}
                </Badge>
              )}

              {detectedMode === 'video' && (
                <p className="font-body text-sm text-stone-muted">
                  Distill can&apos;t process video links yet. It only reads PDFs, articles, and text.
                </p>
              )}

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border-warm" />
                <span className="font-mono text-xs text-stone-muted">OR</span>
                <div className="h-px flex-1 bg-border-warm" />
              </div>

              <label
                onDragOver={event => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={[
                  'flex h-24 cursor-pointer items-center justify-center gap-2 rounded border border-dashed font-body text-sm transition-colors duration-150',
                  isDragging
                    ? 'border-forest bg-forest-light text-forest'
                    : 'border-border-warm bg-cream text-stone-muted hover:border-forest hover:text-forest',
                ].join(' ')}
              >
                <UploadIcon className="h-4 w-4" />
                {file ? file.name : 'Drag a file here, or click to browse'}
                <input
                  type="file"
                  accept=".pdf,.epub,.docx,.txt"
                  className="hidden"
                  onChange={event => {
                    const picked = event.target.files?.[0] ?? null
                    setFile(picked)
                    if (picked) setTextValue('')
                    setError(null)
                  }}
                />
              </label>

              <p className="-mt-2 font-body text-xs text-stone-muted">Supports PDF, DOCX, EPUB, and TXT</p>

              {error && (
                <div className="flex items-start gap-2 rounded border border-border-warm bg-surface p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-muted" />
                  <p className="font-body text-sm text-stone-ink">{error}</p>
                </div>
              )}

              <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
                {isLoading ? 'Extracting...' : 'Add to note'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
