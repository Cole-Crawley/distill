import { useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import {
  Bold,
  Code,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Redo2,
  Sparkles,
  Strikethrough,
  Underline,
  Undo2,
  Upload as UploadIcon,
} from 'lucide-react'
import { DropdownMenu } from '../../components/ui/dropdown-menu'
import Button from '../../components/Button'
import { adjustTodoIndent, applyBlockCommand, BLOCK_COMMANDS, findTodoAncestor } from './blockCommands'

interface NoteToolbarProps {
  onCommand: () => void
  onClarify: () => void
  clarifying: boolean
  onUploadClick: () => void
}

const TOOLBAR_BLOCK_TYPES = BLOCK_COMMANDS.filter(cmd =>
  ['text', 'heading1', 'heading2', 'heading3', 'quote', 'code-block'].includes(cmd.id)
)

function ToolbarIconButton({
  onAction,
  label,
  children,
}: {
  onAction: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      onMouseDown={event => {
        event.preventDefault()
        onAction()
      }}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-stone-muted transition-colors duration-150 hover:bg-forest-light hover:text-forest"
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border-warm" />
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value)
}

function toggleInlineCode() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return
  const range = selection.getRangeAt(0)

  const container =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : (range.commonAncestorContainer as Element)
  const existingCode = container?.closest('code')

  if (existingCode) {
    const parent = existingCode.parentNode
    while (existingCode.firstChild) parent?.insertBefore(existingCode.firstChild, existingCode)
    parent?.removeChild(existingCode)
    return
  }

  const code = document.createElement('code')
  try {
    range.surroundContents(code)
  } catch {
    const contents = range.extractContents()
    code.appendChild(contents)
    range.insertNode(code)
  }
}

// Indents to-do rows manually (execCommand can't handle our custom checkbox div); falls back to native list indent otherwise.
function adjustIndent(delta: number) {
  const selection = window.getSelection()
  const todoRow = findTodoAncestor(selection?.anchorNode ?? null)
  if (todoRow) {
    adjustTodoIndent(todoRow, delta)
    return
  }
  exec(delta > 0 ? 'indent' : 'outdent')
}

function findLinkAncestor(node: Node | null): HTMLAnchorElement | null {
  if (!node) return null
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
  return el?.closest('a') ?? null
}

export default function NoteToolbar({ onCommand, onClarify, clarifying, onUploadClick }: NoteToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [editingExistingLink, setEditingExistingLink] = useState(false)
  const savedRangeRef = useRef<Range | null>(null)

  function run(action: () => void) {
    action()
    onCommand()
  }

  function closeLinkPopover() {
    setLinkOpen(false)
    setLinkUrl('')
    setEditingExistingLink(false)
  }

  function handleLinkButtonMouseDown(event: MouseEvent) {
    event.preventDefault()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const existingLink = findLinkAncestor(selection.anchorNode)
    if (existingLink) {
      const linkRange = document.createRange()
      linkRange.selectNodeContents(existingLink)
      selection.removeAllRanges()
      selection.addRange(linkRange)
      savedRangeRef.current = linkRange.cloneRange()
      setLinkUrl(existingLink.getAttribute('href') ?? '')
      setEditingExistingLink(true)
      setLinkOpen(true)
      return
    }

    if (selection.isCollapsed) return
    savedRangeRef.current = selection.getRangeAt(0).cloneRange()
    setLinkUrl('')
    setEditingExistingLink(false)
    setLinkOpen(true)
  }

  function restoreLinkSelection() {
    const selection = window.getSelection()
    if (!savedRangeRef.current) return
    selection?.removeAllRanges()
    selection?.addRange(savedRangeRef.current)
  }

  function confirmLink() {
    const url = linkUrl.trim()
    if (!url || !savedRangeRef.current) {
      closeLinkPopover()
      return
    }
    restoreLinkSelection()
    if (editingExistingLink) exec('unlink')
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    exec('createLink', normalized)
    closeLinkPopover()
    onCommand()
  }

  function removeLink() {
    if (!savedRangeRef.current) {
      closeLinkPopover()
      return
    }
    restoreLinkSelection()
    exec('unlink')
    closeLinkPopover()
    onCommand()
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-border-warm bg-cream px-6 py-2">
      <DropdownMenu
        options={TOOLBAR_BLOCK_TYPES.map(command => ({
          label: command.label,
          Icon: <command.icon className="h-4 w-4" />,
          onClick: () => run(() => applyBlockCommand(command.id)),
        }))}
      >
        <Pilcrow className="h-4 w-4" />
      </DropdownMenu>

      <ToolbarDivider />

      <ToolbarIconButton label="Bold" onAction={() => run(() => exec('bold'))}>
        <Bold className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Italic" onAction={() => run(() => exec('italic'))}>
        <Italic className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Underline" onAction={() => run(() => exec('underline'))}>
        <Underline className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Strikethrough" onAction={() => run(() => exec('strikeThrough'))}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Inline code" onAction={() => run(toggleInlineCode)}>
        <Code className="h-4 w-4" />
      </ToolbarIconButton>

      <ToolbarDivider />

      <ToolbarIconButton label="Bulleted list" onAction={() => run(() => applyBlockCommand('bulleted-list'))}>
        <List className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Numbered list" onAction={() => run(() => applyBlockCommand('numbered-list'))}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="To-do checklist" onAction={() => run(() => applyBlockCommand('todo'))}>
        <ListTodo className="h-4 w-4" />
      </ToolbarIconButton>

      <ToolbarDivider />

      <ToolbarIconButton label="Decrease indent" onAction={() => run(() => adjustIndent(-1))}>
        <IndentDecrease className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Increase indent" onAction={() => run(() => adjustIndent(1))}>
        <IndentIncrease className="h-4 w-4" />
      </ToolbarIconButton>

      <ToolbarDivider />

      <div className="relative">
        <button
          onMouseDown={handleLinkButtonMouseDown}
          title="Link"
          aria-label="Link"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-stone-muted transition-colors duration-150 hover:bg-forest-light hover:text-forest"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        {linkOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 flex w-64 flex-col gap-1.5 rounded border border-border-warm bg-surface p-2 shadow-warm">
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={linkUrl}
                onChange={event => setLinkUrl(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirmLink()
                  }
                  if (event.key === 'Escape') closeLinkPopover()
                }}
                placeholder="Paste a URL..."
                className="h-8 flex-1 rounded border border-border-warm bg-cream px-2 font-body text-xs text-stone-ink focus:border-forest focus:outline-none focus:ring-0"
              />
              <button
                onMouseDown={event => {
                  event.preventDefault()
                  confirmLink()
                }}
                className="h-8 shrink-0 rounded bg-forest px-2 font-body text-xs font-medium text-cream hover:bg-forest-dark"
              >
                {editingExistingLink ? 'Update' : 'Add'}
              </button>
            </div>
            {editingExistingLink && (
              <button
                onMouseDown={event => {
                  event.preventDefault()
                  removeLink()
                }}
                className="self-start font-body text-xs text-stone-muted underline decoration-dotted hover:text-stone-ink"
              >
                Remove link
              </button>
            )}
          </div>
        )}
      </div>

      <ToolbarIconButton label="Divider" onAction={() => run(() => applyBlockCommand('divider'))}>
        <Minus className="h-4 w-4" />
      </ToolbarIconButton>

      <ToolbarDivider />

      <ToolbarIconButton label="Undo" onAction={() => run(() => exec('undo'))}>
        <Undo2 className="h-4 w-4" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Redo" onAction={() => run(() => exec('redo'))}>
        <Redo2 className="h-4 w-4" />
      </ToolbarIconButton>

      <div className="flex-1" />

      <Button variant="secondary" size="sm" onClick={onClarify} disabled={clarifying}>
        <Sparkles className="h-4 w-4" />
        {clarifying ? 'Distilling...' : 'Distill Note'}
      </Button>
      <button
        onClick={onUploadClick}
        className="flex h-8 items-center gap-1.5 rounded bg-forest px-3 font-body text-sm font-medium text-cream transition-colors duration-150 hover:bg-forest-dark"
      >
        <UploadIcon className="h-4 w-4" />
        Upload
      </button>
    </div>
  )
}
