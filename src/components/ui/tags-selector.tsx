import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Plus, Sparkles, X } from 'lucide-react'

export type TagSource = 'ai' | 'custom'

export type Tag = {
  id: string
  label: string
  source: TagSource
}

type TagsSelectorProps = {
  /** Candidate tags to offer — typically AI-suggested keywords. */
  tags: Tag[]
  /** Currently selected tags — controlled by the parent so it can persist the final list. */
  selected: Tag[]
  onChange: (tags: Tag[]) => void
}

export function TagsSelector({ tags, selected, onChange }: TagsSelectorProps) {
  const [draft, setDraft] = useState('')
  const selectedContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    selectedContainerRef.current?.scrollTo({
      left: selectedContainerRef.current.scrollWidth,
      behavior: 'smooth',
    })
  }, [selected])

  const availableTags = tags.filter(tag => !selected.some(s => s.id === tag.id))

  function selectTag(tag: Tag) {
    onChange([...selected, tag])
  }

  function removeTag(tag: Tag) {
    onChange(selected.filter(t => t.id !== tag.id))
  }

  function addCustomTag() {
    const label = draft.trim()
    if (!label) return

    const existing = [...tags, ...selected].find(t => t.label.toLowerCase() === label.toLowerCase())
    if (existing) {
      if (!selected.some(t => t.id === existing.id)) selectTag(existing)
    } else {
      selectTag({ id: crypto.randomUUID(), label, source: 'custom' })
    }
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addCustomTag()
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-wide text-stone-muted">Tags</span>

      <motion.div
        ref={selectedContainerRef}
        layout
        className="no-scrollbar flex min-h-[3rem] w-full items-center gap-1.5 overflow-x-auto rounded border border-border-warm bg-cream p-1.5"
      >
        {selected.length === 0 && (
          <span className="px-2 font-body text-xs text-stone-muted">
            No tags yet. Pick a suggestion below or add your own.
          </span>
        )}
        {selected.map(tag => (
          <motion.div
            key={tag.id}
            layoutId={`tag-${tag.id}`}
            className="flex shrink-0 items-center gap-1 rounded-sm bg-forest-light py-0.5 pl-2 pr-1 font-mono text-xs text-forest"
          >
            {tag.source === 'ai' && <Sparkles className="h-3 w-3 shrink-0" />}
            {tag.label}
            <button
              onClick={() => removeTag(tag)}
              className="rounded-sm p-0.5 text-forest/70 hover:text-forest"
              aria-label={`Remove ${tag.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </motion.div>

      {availableTags.length > 0 && (
        <motion.div layout className="flex flex-wrap gap-1.5 rounded border border-border-warm bg-surface p-2">
          {availableTags.map(tag => (
            <motion.button
              key={tag.id}
              layoutId={`tag-${tag.id}`}
              onClick={() => selectTag(tag)}
              className="flex shrink-0 items-center gap-1 rounded-sm border border-border-warm bg-cream px-2 py-0.5 font-mono text-xs text-stone-muted transition-colors duration-150 hover:bg-forest-light hover:text-forest"
            >
              {tag.source === 'ai' && <Sparkles className="h-3 w-3 shrink-0" />}
              {tag.label}
            </motion.button>
          ))}
        </motion.div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add your own tag..."
          className="h-9 flex-1 rounded border border-border-warm bg-cream px-3 font-body text-sm text-stone-ink focus:border-forest focus:outline-none focus:ring-0"
        />
        <button
          onClick={addCustomTag}
          disabled={!draft.trim()}
          className="flex h-9 items-center gap-1 rounded border border-border-warm bg-surface px-3 font-body text-sm text-stone-ink transition-colors duration-150 hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  )
}
