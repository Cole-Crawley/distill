import { Code, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, Minus, Pilcrow, Quote } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type BlockCommandId =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'quote'
  | 'code-block'
  | 'bulleted-list'
  | 'numbered-list'
  | 'todo'
  | 'divider'

export interface BlockCommand {
  id: BlockCommandId
  label: string
  keywords: string[]
  icon: LucideIcon
}

export const TODO_HTML = '<div class="note-todo"><input type="checkbox" contenteditable="false">&nbsp;</div>'

export const BLOCK_COMMANDS: BlockCommand[] = [
  { id: 'text', label: 'Text', keywords: ['paragraph', 'text', 'plain'], icon: Pilcrow },
  { id: 'heading1', label: 'Heading 1', keywords: ['h1', 'heading', 'title', 'big'], icon: Heading1 },
  { id: 'heading2', label: 'Heading 2', keywords: ['h2', 'heading', 'subtitle'], icon: Heading2 },
  { id: 'heading3', label: 'Heading 3', keywords: ['h3', 'heading'], icon: Heading3 },
  { id: 'bulleted-list', label: 'Bulleted list', keywords: ['bullet', 'ul', 'list'], icon: List },
  { id: 'numbered-list', label: 'Numbered list', keywords: ['numbered', 'ol', 'ordered', 'list'], icon: ListOrdered },
  { id: 'todo', label: 'To-do checklist', keywords: ['todo', 'task', 'checkbox', 'checklist'], icon: ListTodo },
  { id: 'quote', label: 'Quote', keywords: ['blockquote', 'quote'], icon: Quote },
  { id: 'code-block', label: 'Code block', keywords: ['code', 'pre', 'snippet'], icon: Code },
  { id: 'divider', label: 'Divider', keywords: ['hr', 'divider', 'line', 'separator'], icon: Minus },
]

export function applyBlockCommand(id: BlockCommandId) {
  switch (id) {
    case 'text':
      document.execCommand('formatBlock', false, '<p>')
      break
    case 'heading1':
      document.execCommand('formatBlock', false, '<h1>')
      break
    case 'heading2':
      document.execCommand('formatBlock', false, '<h2>')
      break
    case 'heading3':
      document.execCommand('formatBlock', false, '<h3>')
      break
    case 'quote':
      document.execCommand('formatBlock', false, '<blockquote>')
      break
    case 'code-block':
      document.execCommand('formatBlock', false, '<pre>')
      break
    case 'bulleted-list':
      document.execCommand('insertUnorderedList')
      break
    case 'numbered-list':
      document.execCommand('insertOrderedList')
      break
    case 'todo':
      document.execCommand('insertHTML', false, TODO_HTML)
      break
    case 'divider':
      document.execCommand('insertHorizontalRule')
      break
  }
}

export function filterBlockCommands(query: string, commands: BlockCommand[] = BLOCK_COMMANDS): BlockCommand[] {
  const q = query.trim().toLowerCase()
  if (!q) return commands
  return commands.filter(
    cmd => cmd.label.toLowerCase().includes(q) || cmd.keywords.some(keyword => keyword.includes(q))
  )
}

const MAX_TODO_INDENT = 4

export function findTodoAncestor(node: Node | null): HTMLElement | null {
  if (!node) return null
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
  return (el?.closest('.note-todo') as HTMLElement | null) ?? null
}

// Nested checklists are just a data-indent level on the row, set directly since execCommand's indent doesn't work on plain divs.
export function adjustTodoIndent(todoRow: HTMLElement, delta: number) {
  const current = Number(todoRow.getAttribute('data-indent') ?? '0')
  const next = Math.min(MAX_TODO_INDENT, Math.max(0, current + delta))
  if (next === 0) todoRow.removeAttribute('data-indent')
  else todoRow.setAttribute('data-indent', String(next))
}
