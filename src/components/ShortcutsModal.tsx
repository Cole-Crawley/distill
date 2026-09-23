import { X } from 'lucide-react'

interface ShortcutsModalProps {
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: Array<{ keys: string[]; description: string }>
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Formatting',
    shortcuts: [
      { keys: ['Ctrl', 'B'], description: 'Bold' },
      { keys: ['Ctrl', 'I'], description: 'Italic' },
      { keys: ['Ctrl', 'U'], description: 'Underline' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    ],
  },
  {
    title: 'Blocks',
    shortcuts: [
      { keys: ['/'], description: 'Open the block menu at the start of an empty line (heading, list, quote, code, to-do, divider)' },
      { keys: ['Tab'], description: 'Indent a to-do item' },
      { keys: ['Shift', 'Tab'], description: 'Outdent a to-do item' },
      { keys: ['Enter'], description: 'New to-do row (or turn an empty one back into a paragraph)' },
    ],
  },
  {
    title: 'Study session',
    shortcuts: [{ keys: ['0–5'], description: 'Rate a card once its answer is showing' }],
  },
]

function KeyCap({ label }: { label: string }) {
  return (
    <kbd className="rounded border border-border-warm bg-surface px-1.5 py-0.5 font-mono text-xs text-stone-ink shadow-sm">
      {label}
    </kbd>
  )
}

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-ink/40 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded border border-border-warm bg-cream shadow-warm"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-warm px-6 py-4">
          <h2 className="font-display text-lg leading-snug text-stone-ink">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-stone-muted hover:text-stone-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.title} className="flex flex-col gap-2">
              <p className="font-mono text-xs uppercase tracking-wide text-stone-muted">{group.title}</p>
              <div className="flex flex-col gap-2">
                {group.shortcuts.map(shortcut => (
                  <div key={shortcut.description} className="flex items-start justify-between gap-4">
                    <p className="font-body text-sm text-stone-ink">{shortcut.description}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <span key={key} className="flex items-center gap-1">
                          <KeyCap label={key} />
                          {index < shortcut.keys.length - 1 && (
                            <span className="text-xs text-stone-muted">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
