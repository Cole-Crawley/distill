import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import DOMPurify from 'dompurify'
import { AlertCircle, X } from 'lucide-react'
import { db } from '../lib/db'
import { ai } from '../lib/ai-adapter'
import { TagsSelector, type Tag } from '../components/ui/tags-selector'
import DropletLoader from '../components/DropletLoader'
import NoteToolbar from '../features/notes/NoteToolbar'
import CardsSection from '../features/notes/CardsSection'
import SourcesBar from '../features/notes/SourcesBar'
import SlashMenu, { type SlashMenuState } from '../features/notes/SlashMenu'
import {
  adjustTodoIndent,
  applyBlockCommand,
  BLOCK_COMMANDS,
  filterBlockCommands,
  findTodoAncestor,
  type BlockCommandId,
} from '../features/notes/blockCommands'
import UploadModal from '../features/upload/UploadModal'
import type { Document, IngestedContent } from '../types'

const SAVE_DEBOUNCE_MS = 800

function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, word => word[0].toUpperCase() + word.slice(1).toLowerCase())
}

function buildAiTags(keywords: string[], excludeLabels: Set<string>): Tag[] {
  const seen = new Set<string>()
  const tags: Tag[] = []
  for (const keyword of keywords) {
    const label = toTitleCase(keyword.trim())
    const key = label.toLowerCase()
    if (!label || seen.has(key) || excludeLabels.has(key)) continue
    seen.add(key)
    tags.push({ id: `ai-${key.replace(/\s+/g, '-')}`, label, source: 'ai' })
  }
  return tags
}

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>()
  const documentId = Number(id)
  const doc = useLiveQuery(() => db.documents.get(documentId), [documentId])

  if (doc === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-body text-sm text-stone-muted">Loading...</p>
      </div>
    )
  }

  if (doc === null || !doc.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-body text-sm text-stone-muted">This note doesn&apos;t exist.</p>
      </div>
    )
  }

  return <NoteEditor key={doc.id} initialDocument={doc} />
}

function NoteEditor({ initialDocument }: { initialDocument: Document }) {
  const documentId = initialDocument.id!
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest edits, kept in sync on every keystroke so flushSave has something to read after React nulls the DOM refs on unmount.
  const pendingRef = useRef({
    title: initialDocument.title,
    contentHtml: initialDocument.contentHtml,
    rawText: initialDocument.rawText,
  })
  // Frozen at mount so a background autosave refetch can't reset the editor to stale HTML mid-typing.
  // Sanitized before it ever reaches dangerouslySetInnerHTML below: contentHtml is arbitrary HTML the
  // browser's own contentEditable produced (via typing, execCommand toolbar actions, or a pasted rich-text
  // clipboard), so it can carry a live onerror/onload handler an attacker embedded in something the user
  // copied from elsewhere — confirmed live: an unsanitized <img onerror=...> re-fired on every reopen of
  // the note, a real stored-XSS bug. DOMPurify strips event-handler attributes and script-capable elements
  // while preserving the formatting markup execCommand actually produces (bold/italic/lists/links/etc.).
  const initialHtmlRef = useRef(DOMPurify.sanitize(initialDocument.contentHtml))

  const [title, setTitle] = useState(initialDocument.title)
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    initialDocument.topicKeywords.map(label => ({
      id: `saved-${label.toLowerCase().replace(/\s+/g, '-')}`,
      label,
      source: 'custom' as const,
    }))
  )
  const [aiTagPool, setAiTagPool] = useState<Tag[]>([])
  const [summary, setSummary] = useState(initialDocument.summary)
  const [clarifying, setClarifying] = useState(false)
  const [clarifyError, setClarifyError] = useState<string | null>(null)
  const [relationshipNotice, setRelationshipNotice] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [insertingUpload, setInsertingUpload] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null)
  // Lets the in-flight Claude request actually be aborted (not just its result discarded) if the
  // user cancels mid-call — one controller per clarify flow, since either can be running independently.
  const clarifyAbortRef = useRef<AbortController | null>(null)
  const uploadClarifyAbortRef = useRef<AbortController | null>(null)

  function scheduleSave() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS)
  }

  function flushSave() {
    saveTimeoutRef.current = null
    const { title: pendingTitle, contentHtml, rawText } = pendingRef.current
    void db.documents.update(documentId, {
      title: pendingTitle.trim() || 'Untitled',
      contentHtml,
      rawText,
      wordCount: rawText.split(/\s+/).filter(Boolean).length,
    })
  }

  function syncBodyToPending() {
    if (!bodyRef.current) return
    pendingRef.current.contentHtml = bodyRef.current.innerHTML
    pendingRef.current.rawText = bodyRef.current.textContent ?? ''
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value)
    pendingRef.current.title = event.target.value
    scheduleSave()
  }

  function handleBodyInput() {
    syncBodyToPending()
    scheduleSave()
    updateSlashMenu()
  }

  // Forces every paste to plain text instead of letting the browser insert the clipboard's HTML
  // as-is. Two reasons: it closes off the same stored-XSS vector fixed by sanitizing initialHtmlRef
  // above (rich HTML copied from an untrusted page can carry a live onerror/onload handler), and it
  // stops formatting/markup from other sites (fonts, classes, stray spans) bleeding into the note.
  function handleBodyPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    syncBodyToPending()
    scheduleSave()
    updateSlashMenu()
  }

  // Typing "/" at the start of an empty block opens the Notion-style command menu.
  function updateSlashMenu() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      setSlashMenu(null)
      return
    }
    const anchorNode = selection.anchorNode
    if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) {
      setSlashMenu(null)
      return
    }
    const textBeforeCursor = (anchorNode.textContent ?? '').slice(0, selection.anchorOffset)
    const match = /^\/(\w*)$/.exec(textBeforeCursor)
    if (!match) {
      setSlashMenu(null)
      return
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect()
    setSlashMenu({ query: match[1], position: { top: rect.bottom + 4, left: rect.left }, activeIndex: 0 })
  }

  function applySlashCommand(id: BlockCommandId) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && slashMenu) {
      const anchorNode = selection.anchorNode
      if (anchorNode) {
        const offset = selection.anchorOffset
        const deleteFrom = Math.max(0, offset - (slashMenu.query.length + 1))
        // Delete the "/query" text via execCommand so undo history stays correct.
        const range = document.createRange()
        range.setStart(anchorNode, deleteFrom)
        range.setEnd(anchorNode, offset)
        selection.removeAllRanges()
        selection.addRange(range)
        document.execCommand('delete')
      }
    }
    applyBlockCommand(id)
    setSlashMenu(null)
    syncBodyToPending()
    scheduleSave()
    bodyRef.current?.focus()
  }

  // The browser's default Enter handling breaks our custom to-do rows, so it's handled manually here.
  function handleBodyKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (slashMenu) {
      const commands = filterBlockCommands(slashMenu.query, BLOCK_COMMANDS)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSlashMenu(menu => (menu ? { ...menu, activeIndex: Math.min(menu.activeIndex + 1, commands.length - 1) } : menu))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSlashMenu(menu => (menu ? { ...menu, activeIndex: Math.max(menu.activeIndex - 1, 0) } : menu))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const chosen = commands[slashMenu.activeIndex]
        if (chosen) applySlashCommand(chosen.id)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setSlashMenu(null)
        return
      }
    }

    if (event.key === 'Tab') {
      const selection = window.getSelection()
      const todoRow = findTodoAncestor(selection?.anchorNode ?? null)
      if (todoRow) {
        event.preventDefault()
        adjustTodoIndent(todoRow, event.shiftKey ? -1 : 1)
        syncBodyToPending()
        scheduleSave()
      }
      return
    }

    if (event.key !== 'Enter' || event.shiftKey) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const anchor = selection.anchorNode
    const anchorElement = anchor instanceof Element ? anchor : anchor?.parentElement
    const todoRow = anchorElement?.closest('.note-todo')
    if (!todoRow) return

    event.preventDefault()
    const isEmpty = !todoRow.textContent?.replace(/\u00A0/g, '').trim()

    let target: HTMLElement
    if (isEmpty) {
      target = document.createElement('p')
      target.innerHTML = '<br>'
      todoRow.replaceWith(target)
    } else {
      target = document.createElement('div')
      target.className = 'note-todo'
      const indent = todoRow.getAttribute('data-indent')
      if (indent) target.setAttribute('data-indent', indent)
      target.innerHTML = '<input type="checkbox" contenteditable="false">&nbsp;'
      todoRow.after(target)
    }

    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)

    syncBodyToPending()
    scheduleSave()
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        flushSave()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void db.documents.update(documentId, { topicKeywords: selectedTags.map(tag => tag.label) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags])

  // To-do checkboxes are plain DOM nodes, so this mirrors their checked state onto the checked attribute to survive HTML serialisation.
  useEffect(() => {
    const container = bodyRef.current
    if (!container) return

    function handleChange(event: Event) {
      const target = event.target
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return
      target.toggleAttribute('checked', target.checked)
      const todoRow = target.parentElement
      todoRow?.classList.toggle('note-todo-checked', target.checked)

      // Move focus back into the row's text so typing resumes in the right place after clicking the checkbox.
      if (todoRow && container) {
        const range = document.createRange()
        range.selectNodeContents(todoRow)
        range.collapse(false)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        container.focus()
      }

      syncBodyToPending()
      scheduleSave()
    }

    container.addEventListener('change', handleChange)
    return () => container.removeEventListener('change', handleChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Clarify with AI": asks Claude for a summary/cards/topic/keywords, saves the cards, then finds and saves relationships to other notes for the Knowledge Map.
  async function handleClarify() {
    const rawText = bodyRef.current?.textContent?.trim() ?? ''
    if (!rawText) {
      // Previously silently did nothing here — clicking Clarify on an empty note gave no
      // feedback at all, which reads as "the button is broken" rather than "there's nothing
      // to clarify yet." Reuses the existing error-message slot rather than adding new UI.
      setClarifyError('Write something in the note first, then clarify it.')
      return
    }

    const controller = new AbortController()
    clarifyAbortRef.current = controller

    setClarifying(true)
    setClarifyError(null)
    setRelationshipNotice(null)
    try {
      const result = await ai.analyseDocument(rawText, controller.signal)

      setSummary(result.summary)
      const existingLabels = new Set(selectedTags.map(tag => tag.label.toLowerCase()))
      const newAiTags = buildAiTags(result.keywords, existingLabels)
      setAiTagPool(newAiTags)
      const mergedTags = [...selectedTags, ...newAiTags]
      setSelectedTags(mergedTags)

      await db.documents.update(documentId, {
        summary: result.summary,
        topic: result.topic,
        topicKeywords: mergedTags.map(tag => tag.label),
        cardCount: result.cards.length,
      })

      await db.cards.where('documentId').equals(documentId).delete()
      if (result.cards.length > 0) {
        await db.cards.bulkAdd(
          result.cards.map(card => ({
            documentId,
            front: card.front,
            back: card.back,
            type: card.type,
            status: 'new' as const,
            interval: 0,
            repetition: 0,
            easeFactor: 2.5,
            due: new Date(),
            createdAt: new Date(),
          }))
        )
      }

      const existingDocs = (await db.documents.toArray()).filter(doc => doc.id !== documentId)
      const relationships = await ai.detectRelationships(
        { title, summary: result.summary, keywords: mergedTags.map(tag => tag.label) },
        existingDocs.map(doc => ({
          id: doc.id!,
          title: doc.title,
          summary: doc.summary,
          keywords: doc.topicKeywords,
        })),
        controller.signal
      )
      await db.relationships.where('sourceDocumentId').equals(documentId).delete()
      if (relationships.length > 0) {
        await db.relationships.bulkAdd(
          relationships.map(rel => ({
            sourceDocumentId: documentId,
            targetDocumentId: rel.targetDocumentId,
            relationshipType: rel.relationshipType,
            strength: rel.strength,
            reason: rel.reason,
            createdAt: new Date(),
          }))
        )
        setRelationshipNotice(
          `Connected to ${relationships.length} existing ${relationships.length === 1 ? 'note' : 'notes'}.`
        )
      }
    } catch (err) {
      // A cancelled request is an intentional user action, not a failure — leave no error behind.
      if (controller.signal.aborted) return
      setClarifyError(err instanceof Error ? err.message : 'Something went wrong while clarifying this note.')
    } finally {
      clarifyAbortRef.current = null
      setClarifying(false)
    }
  }

  function handleCancelClarify() {
    clarifyAbortRef.current?.abort()
  }

  function handleCancelUploadClarify() {
    uploadClarifyAbortRef.current?.abort()
  }

  function insertTextIntoBody(text: string) {
    if (!bodyRef.current) return
    const paragraph = window.document.createElement('p')
    paragraph.textContent = text
    if (bodyRef.current.textContent?.trim()) {
      bodyRef.current.appendChild(paragraph)
    } else {
      bodyRef.current.replaceChildren(paragraph)
    }
    syncBodyToPending()
  }

  // Runs after an upload finishes extracting: fills the title, inserts the raw or AI-summarised text into the note, and (for real uploads only) saves a SourceAttachment for the SourcesBar pill.
  async function handleExtracted(content: IngestedContent, shouldClarify: boolean, isUpload: boolean) {
    if (!titleRef.current?.value.trim() || titleRef.current.value === 'Untitled') {
      setTitle(content.title)
      pendingRef.current.title = content.title
    }

    // Only true if the AI summary actually landed, not just because the user asked for one.
    let wasClarified = false

    if (shouldClarify) {
      const controller = new AbortController()
      uploadClarifyAbortRef.current = controller

      setInsertingUpload(true)
      setUploadError(null)
      try {
        const result = await ai.analyseDocument(content.rawText, controller.signal)
        insertTextIntoBody(result.summary)
        wasClarified = true
      } catch (err) {
        // Cancelled deliberately: add nothing at all, rather than falling back to inserting the
        // full text the user didn't ask for — they chose "Clarify, then add", not "Add as-is".
        if (controller.signal.aborted) {
          uploadClarifyAbortRef.current = null
          setInsertingUpload(false)
          return
        }
        setUploadError(
          err instanceof Error
            ? `Couldn't clarify this upload, so the full text was added instead: ${err.message}`
            : "Couldn't clarify this upload, so the full text was added instead."
        )
        insertTextIntoBody(content.rawText)
      } finally {
        uploadClarifyAbortRef.current = null
        setInsertingUpload(false)
      }
    } else {
      insertTextIntoBody(content.rawText)
    }

    if (isUpload) {
      await db.sources.add({
        documentId,
        title: content.title,
        rawText: content.rawText,
        sourceType: content.sourceType,
        ...(content.sourceUrl ? { sourceUrl: content.sourceUrl } : {}),
        ...(content.metadata ? { metadata: content.metadata } : {}),
        wordCount: content.wordCount,
        wasClarified,
        createdAt: new Date(),
      })
    }

    scheduleSave()
  }

  return (
    <div className="flex h-full flex-col">
      <NoteToolbar
        onCommand={handleBodyInput}
        onClarify={handleClarify}
        clarifying={clarifying}
        onUploadClick={() => setUploadOpen(true)}
      />

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <input
            ref={titleRef}
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full border-none bg-transparent font-display text-3xl text-stone-ink focus:outline-none"
          />

          <SourcesBar documentId={documentId} />

          {insertingUpload && (
            <div className="flex items-center justify-between gap-3 rounded bg-forest-light px-4 py-3">
              <DropletLoader className="h-9 w-9" label="Clarifying upload before adding it..." />
              <button
                onClick={handleCancelUploadClarify}
                className="shrink-0 rounded px-2 py-1 font-body text-xs font-medium text-forest underline decoration-dotted hover:text-forest-dark"
              >
                Cancel
              </button>
            </div>
          )}

          {uploadError && (
            <div className="flex items-start gap-2 rounded border border-border-warm bg-surface p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-muted" />
              <p className="font-body text-sm text-stone-ink">{uploadError}</p>
            </div>
          )}

          {clarifying && (
            <div className="flex items-center justify-between gap-3 rounded bg-forest-light px-4 py-3">
              <DropletLoader className="h-9 w-9" label="Distilling this note with AI..." />
              <button
                onClick={handleCancelClarify}
                className="shrink-0 rounded px-2 py-1 font-body text-xs font-medium text-forest underline decoration-dotted hover:text-forest-dark"
              >
                Cancel
              </button>
            </div>
          )}

          <TagsSelector tags={aiTagPool} selected={selectedTags} onChange={setSelectedTags} />

          {clarifyError && (
            <div className="flex items-start gap-2 rounded border border-border-warm bg-surface p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-muted" />
              <p className="font-body text-sm text-stone-ink">{clarifyError}</p>
            </div>
          )}

          {summary && (
            <div className="rounded border-l-4 border-forest bg-surface p-4">
              <p className="mb-2 font-mono text-xs uppercase tracking-wide text-stone-muted">AI Summary</p>
              <p className="whitespace-pre-line font-body text-sm text-stone-ink">{summary}</p>
            </div>
          )}

          {relationshipNotice && (
            <div className="flex items-center justify-between gap-2 rounded bg-forest-light px-3 py-2">
              <p className="font-body text-xs text-forest">{relationshipNotice}</p>
              <button
                onClick={() => setRelationshipNotice(null)}
                aria-label="Dismiss"
                className="text-forest/70 hover:text-forest"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <CardsSection documentId={documentId} />

          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleBodyInput}
            onKeyDown={handleBodyKeyDown}
            onPaste={handleBodyPaste}
            onBlur={() => setSlashMenu(null)}
            onClick={() => setSlashMenu(null)}
            dangerouslySetInnerHTML={{ __html: initialHtmlRef.current }}
            data-placeholder="Start writing, or upload something to get going..."
            className="note-content min-h-[50vh] font-body text-base leading-relaxed text-stone-ink focus:outline-none empty:before:text-stone-muted empty:before:content-[attr(data-placeholder)]"
          />
        </div>
      </div>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onExtracted={handleExtracted} />}
      {slashMenu && (
        <SlashMenu
          state={slashMenu}
          commands={filterBlockCommands(slashMenu.query, BLOCK_COMMANDS)}
          onSelect={applySlashCommand}
        />
      )}
    </div>
  )
}
