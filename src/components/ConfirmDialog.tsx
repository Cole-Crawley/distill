import Button from './Button'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-ink/40 p-6" onClick={onCancel}>
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded border border-border-warm bg-cream p-6 shadow-warm"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-lg text-stone-ink">{title}</h2>
          <p className="font-body text-sm text-stone-muted">{description}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <button
            onClick={onConfirm}
            className="rounded bg-forest px-3 py-1.5 font-body text-sm font-medium text-cream transition-colors duration-150 hover:bg-forest-dark"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
